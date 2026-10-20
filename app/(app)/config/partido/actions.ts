"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

import { createClient } from "@/lib/supabase/server";
import { enviarNotificacion, getUserIdDeMiembros } from "@/lib/push";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

// Convierte "2026-09-26T20:00" (datetime-local en hora AR) a ISO UTC.
// Asumimos que el grupo está en America/Argentina/Buenos_Aires (UTC-3).
function localToUtcIso(local: string): string {
  return new Date(`${local}:00-03:00`).toISOString();
}

export async function guardarPartido(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "No tenés permisos de admin" };
  }
  const groupId = membership.group_id;

  const kickoffLocal = String(formData.get("kickoff") || "").trim();
  const place = String(formData.get("place") || "").trim();
  const cupo = parseInt(String(formData.get("cupo") || "10"), 10);
  const presupuestoRaw = String(formData.get("presupuesto") || "").trim();
  const infinito = formData.get("infinito") === "on";
  const matchId = String(formData.get("match_id") || "").trim();

  if (!kickoffLocal) return { ok: false, error: "Poné fecha y hora" };
  if (![10, 12, 14, 16, 18, 20, 22].includes(cupo)) {
    return { ok: false, error: "Cupo inválido" };
  }

  const budget = infinito ? null : presupuestoRaw ? parseInt(presupuestoRaw, 10) : null;
  if (!infinito && budget !== null && (isNaN(budget) || budget < 0)) {
    return { ok: false, error: "Presupuesto inválido" };
  }

  const kickoffUtc = localToUtcIso(kickoffLocal);
  const kickoffDate = new Date(kickoffUtc);
  const bajaCloses = new Date(kickoffDate.getTime() - 3 * 60 * 60 * 1000);
  const teamsLock = new Date(kickoffDate.getTime() - 10 * 60 * 1000);

  const { data: grupo } = await supabase
    .from("groups")
    .select("convocatoria_dow, convocatoria_time")
    .eq("id", groupId)
    .single();

  const convDow = grupo?.convocatoria_dow ?? 1;
  const convTime = grupo?.convocatoria_time ?? "10:00";

  let convOpen = new Date(kickoffDate);
  for (let i = 0; i < 14; i++) {
    convOpen.setUTCDate(convOpen.getUTCDate() - 1);
    if (convOpen.getUTCDay() === convDow) break;
  }
  const [hh, mm] = convTime.split(":").map((x: string) => parseInt(x, 10));
  const convOpenStr = `${convOpen.toISOString().slice(0, 10)}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-03:00`;
  const convOpenUtc = new Date(convOpenStr).toISOString();

  if (matchId) {
    // ─── Actualizar partido existente ───
    const { error } = await supabase
      .from("matches")
      .update({
        kickoff_at: kickoffUtc,
        place: place || null,
        cupo,
        budget,
        baja_closes_at: bajaCloses.toISOString(),
        teams_lock_at: teamsLock.toISOString(),
        convocatoria_opens_at: convOpenUtc,
      })
      .eq("id", matchId)
      .eq("group_id", groupId);

    if (error) {
      console.error(error);
      return { ok: false, error: "Error al guardar. Probá de nuevo." };
    }

    // Recalcular valor de mercado para esta fecha
    await supabase.rpc("calcular_valor_mercado", {
      p_match_id: matchId,
    });
  } else {
    // ─── Crear nuevo partido ───
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("group_id", groupId)
      .eq("status", "activa")
      .maybeSingle();

    if (!season) {
      return { ok: false, error: "No hay temporada activa" };
    }

    const { data: lastMatch } = await supabase
      .from("matches")
      .select("number")
      .eq("season_id", season.id)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const numero = (lastMatch?.number ?? 0) + 1;

    const { data: matchCreado, error } = await supabase
      .from("matches")
      .insert({
        group_id: groupId,
        season_id: season.id,
        number: numero,
        kickoff_at: kickoffUtc,
        place: place || null,
        cupo,
        budget,
        status: "programada",
        baja_closes_at: bajaCloses.toISOString(),
        teams_lock_at: teamsLock.toISOString(),
        convocatoria_opens_at: convOpenUtc,
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      return { ok: false, error: "Error al crear. Probá de nuevo." };
    }

    // Recalcular valor de mercado para la nueva fecha
    if (matchCreado) {
      await supabase.rpc("calcular_valor_mercado", {
        p_match_id: matchCreado.id,
      });
    }
  }

  revalidatePath("/inicio");
  revalidatePath("/config");
  revalidatePath("/config/partido");
  revalidatePath("/convocatoria");
  redirect("/inicio");
}

export async function eliminarPartido(matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "No tenés permisos de admin" };
  }

  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId)
    .eq("group_id", membership.group_id);

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al eliminar" };
  }

  revalidatePath("/inicio");
  revalidatePath("/config/partido");
  return { ok: true };
}
// // ────────────────────────────────────────────────────────────────
// Avisar al grupo que abrió la convocatoria
// ────────────────────────────────────────────────────────────────
export async function avisarConvocatoria(
  matchId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede avisar" };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, number, group_id")
    .eq("id", matchId)
    .eq("group_id", membership.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };

  const userIds = await getUserIdDeMiembros(membership.group_id);
  if (userIds.length === 0) {
    return { ok: false, error: "No hay miembros activos para avisar" };
  }

  await enviarNotificacion(userIds, {
    title: `⚽ Convocatoria abierta · Fecha ${match.number}`,
    body: "Ya podés anotarte para el próximo partido. ¡No te quedes afuera!",
    url: "/convocatoria",
  });

  return {
    ok: true,
    message: `Aviso enviado a ${userIds.length} miembro${userIds.length !== 1 ? "s" : ""}`,
  };
}

export async function avisarEquiposPendientes(
  matchId: string,
  memberIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);
  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede enviar avisos" };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, number, group_id, status")
    .eq("id", matchId)
    .eq("group_id", membership.group_id)
    .maybeSingle();
  if (!match || match.status !== "programada") {
    return { ok: false, error: "El partido ya no está disponible" };
  }

  const requestedIds = [...new Set(memberIds.filter((id) => typeof id === "string"))];
  if (requestedIds.length === 0) {
    return { ok: false, error: "Seleccioná al menos una persona" };
  }

  const { data: teams, error: teamsError } = await supabase.rpc("get_dts_que_armaron", {
    p_match_id: matchId,
  });
  if (teamsError) {
    console.error("Error comprobando equipos armados:", teamsError);
    return { ok: false, error: "No pudimos comprobar quién ya armó su equipo" };
  }
  const armedIds = new Set(
    (teams ?? []).map((team: { dt_member_id: string }) => team.dt_member_id)
  );

  const { data: recipients, error: recipientsError } = await supabase
    .from("group_members")
    .select("id, user_id")
    .eq("group_id", membership.group_id)
    .eq("status", "activo")
    .not("user_id", "is", null)
    .in("id", requestedIds);
  if (recipientsError) {
    console.error("Error buscando destinatarios:", recipientsError);
    return { ok: false, error: "No pudimos cargar las personas seleccionadas" };
  }

  const userIds = [...new Set(
    (recipients ?? [])
      .filter((recipient) => !armedIds.has(recipient.id))
      .map((recipient) => recipient.user_id)
      .filter((id): id is string => !!id)
  )];
  if (userIds.length === 0) {
    return { ok: false, error: "Las personas seleccionadas ya armaron o no pueden recibir avisos" };
  }

  await enviarNotificacion(userIds, {
    title: `⚽ Armá tu equipo · Fecha ${match.number}`,
    body: "No te olvides de armar tu equipo de fantasía para el próximo partido.",
    url: "/convocatoria",
  });

  return {
    ok: true,
    message: `Aviso enviado a ${userIds.length} persona${userIds.length !== 1 ? "s" : ""}`,
  };
}
