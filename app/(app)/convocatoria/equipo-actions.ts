"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

type PickInput = { member_id: string; slot: "titular" | "suplente" };

export async function guardarEquipo(
  matchId: string,
  picks: PickInput[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const miembro = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!miembro) return { ok: false, error: "No estás activo en el grupo" };

    const { data: match } = await supabase
    .from("matches")
    .select("id, cupo, budget, teams_lock_at, convocatoria_opens_at, group_id, status, season_id, number")
    .eq("id", matchId)
    .eq("group_id", miembro.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };
  if (match.status !== "programada") {
    return { ok: false, error: "El partido no está abierto" };
  }

    const ahora = new Date();
  const cierra = new Date(match.teams_lock_at);

  if (ahora >= cierra) {
    return { ok: false, error: "El armado de equipos ya cerró" };
  }

  // Validar titulares y suplentes
const titulares = picks.filter((p) => p.slot === "titular");
const suplentes = picks.filter((p) => p.slot === "suplente");
const titularesEsperados = Math.floor(match.cupo / 2);

// Primero: traer la lista de convocados válidos
const memberIdsAll = picks.map((p) => p.member_id);
const { data: asistencias } = await supabase
  .from("attendance")
  .select("member_id")
  .eq("match_id", matchId)
  .in("status", ["anotado", "presente", "lista_espera"])
  .in("member_id", memberIdsAll);

const anotadosSet = new Set((asistencias ?? []).map((a) => a.member_id));

// Filtrar picks huérfanos (los que no están convocados)
const picksValidos = picks.filter((p) => anotadosSet.has(p.member_id));

const titularesValidos = picksValidos.filter((p) => p.slot === "titular");
const suplentesValidos = picksValidos.filter((p) => p.slot === "suplente");

if (titularesValidos.length !== titularesEsperados) {
  return {
    ok: false,
    error: `Necesitás ${titularesEsperados} titulares (tenés ${titularesValidos.length})`,
  };
}
if (suplentesValidos.length > 1) {
  return { ok: false, error: "Solo 1 suplente" };
}

// Usamos los válidos de acá en adelante
const picksFinales = picksValidos;
const memberIds = picksFinales.map((p) => p.member_id);

  // Presupuesto
  if (match.budget !== null) {
    const { data: valores } = await supabase
      .from("market_values")
      .select("member_id, value")
      .eq("season_id", match.season_id)
      .eq("match_number", match.number)
      .in("member_id", memberIds);

   const valoresMap = new Map((valores ?? []).map((v) => [v.member_id, v.value]));
const total = picksFinales.reduce((s, p) => s + (valoresMap.get(p.member_id) ?? 0), 0);
    if (total > match.budget) {
      return { ok: false, error: `Te pasaste del presupuesto (${total}/${match.budget})` };
    }
  }

  // Borrar equipo anterior
  const { data: teamExistente } = await supabase
    .from("fantasy_teams")
    .select("id")
    .eq("match_id", matchId)
    .eq("dt_member_id", miembro.id)
    .maybeSingle();

  let teamId: string;

  if (teamExistente) {
    teamId = teamExistente.id;
    await supabase.from("fantasy_picks").delete().eq("team_id", teamId);
    await supabase
      .from("fantasy_teams")
      .update({ submitted_at: new Date().toISOString() })
      .eq("id", teamId);
  } else {
    const { data: teamNuevo, error: errTeam } = await supabase
      .from("fantasy_teams")
      .insert({
        match_id: matchId,
        dt_member_id: miembro.id,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (errTeam || !teamNuevo) {
      console.error(errTeam);
      return { ok: false, error: "Error al crear equipo" };
    }
    teamId = teamNuevo.id;
  }

 const { error: errPicks } = await supabase.from("fantasy_picks").insert(
  picksFinales.map((p) => ({ team_id: teamId, member_id: p.member_id, slot: p.slot }))
);

  if (errPicks) {
    console.error(errPicks);
    return { ok: false, error: "Error al guardar los jugadores" };
  }

  revalidatePath("/convocatoria");
  return { ok: true, message: "¡Equipo guardado!" };
}

export async function borrarEquipo(matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const miembro = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!miembro) return { ok: false, error: "No estás activo en el grupo" };

  const { data: match } = await supabase
    .from("matches")
    .select("teams_lock_at")
    .eq("id", matchId)
    .maybeSingle();

  if (match && new Date() > new Date(match.teams_lock_at)) {
    return { ok: false, error: "Ya cerró el armado de equipos" };
  }

  await supabase
    .from("fantasy_teams")
    .delete()
    .eq("match_id", matchId)
    .eq("dt_member_id", miembro.id);

  revalidatePath("/convocatoria");
  return { ok: true, message: "Equipo borrado" };
}