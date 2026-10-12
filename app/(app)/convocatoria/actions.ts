"use server";

import { enviarNotificacion, getUserIdsDeMembers } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { crearNoticiaAuto } from "@/lib/news";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

async function getMiembroActivo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, miembro: null, error: "No autenticado" };

  const { data: miembro } = await supabase
    .from("group_members")
    .select("id, group_id, role, status, display_name")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!miembro)
    return { supabase, miembro: null, error: "No estás activo en el grupo" };

  return { supabase, miembro, error: null };
}

// ────────────────────────────────────────────────────────────────
// Anotarse al próximo partido
// ────────────────────────────────────────────────────────────────
export async function anotarse(matchId: string): Promise<ActionResult> {
  const { supabase, miembro, error } = await getMiembroActivo();
  if (error || !miembro) return { ok: false, error: error ?? "Error" };

  const { data: match } = await supabase
    .from("matches")
    .select("id, cupo, status, baja_closes_at, group_id")
    .eq("id", matchId)
    .eq("group_id", miembro.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };
  if (match.status !== "programada")
    return { ok: false, error: "El partido no está abierto" };

  const { data: existente } = await supabase
    .from("attendance")
    .select("id, status")
    .eq("match_id", matchId)
    .eq("member_id", miembro.id)
    .maybeSingle();

  if (
    existente &&
    (existente.status === "anotado" || existente.status === "presente")
  ) {
    return { ok: false, error: "Ya estás anotado" };
  }

  const { count: anotados } = await supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .in("status", ["anotado", "presente"]);

  const hayLugar = (anotados ?? 0) < match.cupo;

  if (hayLugar) {
    if (existente) {
      const { error: err } = await supabase
        .from("attendance")
        .update({
          status: "anotado",
          waitlist_order: null,
          signed_up_at: new Date().toISOString(),
          resolved_at: null,
        })
        .eq("id", existente.id);
      if (err) return { ok: false, error: "Error al anotar" };
    } else {
      const { error: err } = await supabase.from("attendance").insert({
        match_id: matchId,
        member_id: miembro.id,
        status: "anotado",
      });
      if (err) return { ok: false, error: "Error al anotar" };
    }

    revalidatePath("/convocatoria");
    revalidatePath("/inicio");
    return { ok: true, message: "¡Estás anotado!" };
  } else {
    const { data: ultimo } = await supabase
      .from("attendance")
      .select("waitlist_order")
      .eq("match_id", matchId)
      .eq("status", "lista_espera")
      .order("waitlist_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const siguienteOrden = (ultimo?.waitlist_order ?? 0) + 1;

    if (existente) {
      const { error: err } = await supabase
        .from("attendance")
        .update({
          status: "lista_espera",
          waitlist_order: siguienteOrden,
          signed_up_at: new Date().toISOString(),
          resolved_at: null,
        })
        .eq("id", existente.id);
      if (err)
        return { ok: false, error: "Error al anotar en lista de espera" };
    } else {
      const { error: err } = await supabase.from("attendance").insert({
        match_id: matchId,
        member_id: miembro.id,
        status: "lista_espera",
        waitlist_order: siguienteOrden,
      });
      if (err)
        return { ok: false, error: "Error al anotar en lista de espera" };
    }

    revalidatePath("/convocatoria");
    revalidatePath("/inicio");
    return {
      ok: true,
      message: `Estás en lista de espera (posición ${siguienteOrden})`,
    };
  }
}

// ────────────────────────────────────────────────────────────────
// Darse de baja (con noticia automática)
// ────────────────────────────────────────────────────────────────
export async function darseDeBaja(matchId: string): Promise<ActionResult> {
  const { supabase, miembro, error } = await getMiembroActivo();
  if (error || !miembro) return { ok: false, error: error ?? "Error" };

  const { data: existente } = await supabase
    .from("attendance")
    .select("id, status")
    .eq("match_id", matchId)
    .eq("member_id", miembro.id)
    .maybeSingle();

  if (
    !existente ||
    (existente.status !== "anotado" &&
      existente.status !== "lista_espera" &&
      existente.status !== "presente")
  ) {
    return { ok: false, error: "No estás anotado" };
  }

  const eraAnotado =
    existente.status === "anotado" || existente.status === "presente";

  const { error: err } = await supabase
    .from("attendance")
    .update({
      status: "baja",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", existente.id);

  if (err) return { ok: false, error: "Error al dar de baja" };

  if (eraAnotado) {
          // 1. Averiguar qué DTs lo tenían (vía RPC para saltar RLS)
    const { data: dtsRaw } = await supabase.rpc("get_dts_con_jugador", {
      p_match_id: matchId,
      p_member_id: miembro.id,
    });

   

    const dtsAfectados: string[] = (dtsRaw ?? [])
      .map((d: { dt_member_id: string }) => d.dt_member_id)
      .filter((x: string) => !!x);

    console.log("[BAJA] dtsAfectados (member_ids):", dtsAfectados);

    const nDts = dtsAfectados.length;

    // 2. Sacarlo de todos los equipos
    if (nDts > 0) {
      const { data: teams } = await supabase
        .from("fantasy_teams")
        .select("id")
        .eq("match_id", matchId);

      const teamIds = (teams ?? []).map((t) => t.id);
      if (teamIds.length > 0) {
        await supabase
          .from("fantasy_picks")
          .delete()
          .in("team_id", teamIds)
          .eq("member_id", miembro.id);
      }
    }

    // 2. Promover al primero de la lista de espera
    const { data: siguiente } = await supabase
      .from("attendance")
      .select("id, member_id")
      .eq("match_id", matchId)
      .eq("status", "lista_espera")
      .order("waitlist_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (siguiente) {
      await supabase
        .from("attendance")
        .update({
          status: "anotado",
          waitlist_order: null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", siguiente.id);
    }

        // 3. Noticia automática
    const detalle =
      nDts > 0
        ? `${nDts} DT${nDts !== 1 ? "s" : ""} lo tenía${nDts !== 1 ? "n" : ""} en su equipo. ¡Reemplazalo a tiempo!`
        : "Podés armar tu equipo sin él.";

    await crearNoticiaAuto({
      groupId: miembro.group_id,
      title: `🔁 Se bajó ${miembro.display_name}`,
      body: detalle,
      payload: { member_id: miembro.id, match_id: matchId },
    });

       // 4. Push: avisar a los DTs que lo tenían
    if (dtsAfectados.length > 0) {
      const userIds = await getUserIdsDeMembers(dtsAfectados);
      
      await enviarNotificacion(userIds, {
        title: `🔁 Se bajó ${miembro.display_name}`,
        body: "Estaba en tu equipo. ¡Reemplazalo antes de que cierre!",
        url: "/convocatoria",
      });
    }
  }

  revalidatePath("/convocatoria");
  revalidatePath("/inicio");
  return { ok: true, message: "Te diste de baja" };
}

// ────────────────────────────────────────────────────────────────
// Anotar varios invitados a la vez (solo admin)
// ────────────────────────────────────────────────────────────────
export async function anotarInvitados(
  matchId: string,
  memberIds: string[]
): Promise<ActionResult> {
  if (memberIds.length === 0)
    return { ok: false, error: "No elegiste invitados" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: admin } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .maybeSingle();

  if (!admin || admin.role !== "admin") {
    return { ok: false, error: "Solo el admin puede anotar invitados" };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("cupo, group_id")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.group_id !== admin.group_id) {
    return { ok: false, error: "Partido no encontrado" };
  }

  const { count: anotados } = await supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .in("status", ["anotado", "presente"]);

  const libres = match.cupo - (anotados ?? 0);
  if (memberIds.length > libres) {
    return {
      ok: false,
      error: `Solo quedan ${libres} lugar${libres !== 1 ? "es" : ""}`,
    };
  }

  const insert = memberIds.map((mid) => ({
    match_id: matchId,
    member_id: mid,
    status: "anotado" as const,
  }));

  const { error: err } = await supabase.from("attendance").insert(insert);
  if (err) {
    console.error(err);
    return { ok: false, error: "Error al anotar los invitados" };
  }

  revalidatePath("/convocatoria");
  revalidatePath("/inicio");
  return {
    ok: true,
    message: `${memberIds.length} invitado${memberIds.length !== 1 ? "s" : ""} anotado${memberIds.length !== 1 ? "s" : ""}`,
  };
}

// ────────────────────────────────────────────────────────────────
// Quitar un invitado del partido (solo admin)
// ────────────────────────────────────────────────────────────────
export async function quitarInvitado(
  matchId: string,
  memberId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: admin } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .maybeSingle();

  if (!admin || admin.role !== "admin") {
    return { ok: false, error: "Solo el admin puede quitar invitados" };
  }

  const { data: target } = await supabase
    .from("group_members")
    .select("id, status, group_id, display_name")
    .eq("id", memberId)
    .eq("group_id", admin.group_id)
    .maybeSingle();

  if (!target || target.status !== "invitado") {
    return { ok: false, error: "El miembro no es un invitado de este grupo" };
  }

  const { error: err } = await supabase
    .from("attendance")
    .delete()
    .eq("match_id", matchId)
    .eq("member_id", memberId);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al quitar al invitado" };
  }

  // Sacarlo de todos los equipos que lo tenían (solo este partido)
  const { data: teams } = await supabase
    .from("fantasy_teams")
    .select("id")
    .eq("match_id", matchId);

  const teamIds = (teams ?? []).map((t) => t.id);
  if (teamIds.length > 0) {
    await supabase
      .from("fantasy_picks")
      .delete()
      .in("team_id", teamIds)
      .eq("member_id", memberId);
  }

  revalidatePath("/convocatoria");
  revalidatePath("/inicio");
  return { ok: true, message: "Invitado quitado del partido" };
}

// ────────────────────────────────────────────────────────────────
// Mover jugadores específicos a lista de espera (solo admin)
// ────────────────────────────────────────────────────────────────
export async function moverAEspera(
  matchId: string,
  memberIds: string[]
): Promise<ActionResult> {
  if (memberIds.length === 0) {
    return { ok: false, error: "No elegiste a nadie" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: admin } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .maybeSingle();

  if (!admin || admin.role !== "admin") {
    return { ok: false, error: "Solo el admin puede mover jugadores" };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, group_id, cupo")
    .eq("id", matchId)
    .eq("group_id", admin.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };

  const { data: asistencias } = await supabase
    .from("attendance")
    .select("id, member_id, status")
    .eq("match_id", matchId)
    .in("member_id", memberIds)
    .in("status", ["anotado", "presente"]);

  if (!asistencias || asistencias.length !== memberIds.length) {
    return { ok: false, error: "Alguno de los elegidos no está anotado" };
  }

  const attIds = asistencias.map((a) => a.id);

  const { error: err } = await supabase
    .from("attendance")
    .update({ status: "lista_espera", waitlist_order: null })
    .in("id", attIds);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al mover a lista de espera" };
  }

  const { data: teams } = await supabase
    .from("fantasy_teams")
    .select("id")
    .eq("match_id", matchId);

  const teamIds = (teams ?? []).map((t) => t.id);
  if (teamIds.length > 0) {
    await supabase
      .from("fantasy_picks")
      .delete()
      .in("team_id", teamIds)
      .in("member_id", memberIds);
  }

  revalidatePath("/convocatoria");
  revalidatePath("/inicio");
  return {
    ok: true,
    message: `${memberIds.length} jugador${memberIds.length !== 1 ? "es" : ""} pasó a lista de espera`,
  };
}

// ────────────────────────────────────────────────────────────────
// Subir jugadores de lista de espera a convocados (solo admin)
// ────────────────────────────────────────────────────────────────
export async function subirAConvocados(
  matchId: string,
  memberIds: string[]
): Promise<ActionResult> {
  if (memberIds.length === 0) {
    return { ok: false, error: "No elegiste a nadie" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: admin } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .maybeSingle();

  if (!admin || admin.role !== "admin") {
    return { ok: false, error: "Solo el admin puede hacer esto" };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, group_id, cupo")
    .eq("id", matchId)
    .eq("group_id", admin.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };

  const { count: anotadosActuales } = await supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .in("status", ["anotado", "presente"]);

  const libres = match.cupo - (anotadosActuales ?? 0);
  if (memberIds.length > libres) {
    return {
      ok: false,
      error: `Solo hay ${libres} lugar${libres !== 1 ? "es" : ""} libre${libres !== 1 ? "s" : ""}`,
    };
  }

  const { data: asistencias } = await supabase
    .from("attendance")
    .select("id, member_id")
    .eq("match_id", matchId)
    .in("member_id", memberIds)
    .eq("status", "lista_espera");

  if (!asistencias || asistencias.length !== memberIds.length) {
    return { ok: false, error: "Alguno de los elegidos no está en lista de espera" };
  }

  const attIds = asistencias.map((a) => a.id);

  const { error: err } = await supabase
    .from("attendance")
    .update({
      status: "anotado",
      waitlist_order: null,
      resolved_at: new Date().toISOString(),
    })
    .in("id", attIds);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al subir a convocados" };
  }

  revalidatePath("/convocatoria");
  revalidatePath("/inicio");
  return {
    ok: true,
    message: `${memberIds.length} jugador${memberIds.length !== 1 ? "es" : ""} subió a convocados`,
  };
}