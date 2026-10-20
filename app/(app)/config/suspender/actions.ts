"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { crearNoticiaAuto } from "@/lib/news";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function suspenderFecha(
  matchId: string,
  motivo: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede suspender fechas" };
  }

  const razon = motivo.trim();
  if (razon.length < 3) {
    return { ok: false, error: "Poné un motivo (mínimo 3 caracteres)" };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, number, status, group_id")
    .eq("id", matchId)
    .eq("group_id", membership.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };

  if (match.status !== "programada") {
    return {
      ok: false,
      error: "Solo se pueden suspender partidos que todavía no se jugaron",
    };
  }

  // 1. Marcar el partido como suspendido
  const { error: err1 } = await supabase
    .from("matches")
    .update({ status: "suspendida" })
    .eq("id", matchId);

  if (err1) {
    console.error(err1);
    return { ok: false, error: "Error al suspender la fecha" };
  }

  // 2. Anular los equipos armados (fantasy_teams + fantasy_picks)
  const { data: teams } = await supabase
    .from("fantasy_teams")
    .select("id")
    .eq("match_id", matchId);

  const teamIds = (teams ?? []).map((t) => t.id);
  if (teamIds.length > 0) {
    await supabase.from("fantasy_picks").delete().in("team_id", teamIds);
    await supabase.from("fantasy_teams").delete().eq("match_id", matchId);
  }

  // 3. Borrar las asistencias (para que no queden anotados en una fecha suspendida)
  await supabase.from("attendance").delete().eq("match_id", matchId);

  // 4. Noticia automática
  await crearNoticiaAuto({
    groupId: membership.group_id,
    title: `⏸️ Fecha ${match.number} suspendida`,
    body: `Motivo: ${razon}. Los equipos armados se anularon y los valores de mercado se conservan.`,
    payload: { match_id: matchId, match_number: match.number },
  });

  // 5. Registrar en historial de correcciones
  await supabase.from("corrections").insert({
    group_id: membership.group_id,
    entity: "otro",
    entity_id: matchId,
    description: `⏸️ Se suspendió la Fecha ${match.number}. Motivo: ${razon}`,
    after_data: { status: "suspendida", reason: razon },
    by_user_id: user.id,
  });

  revalidatePath("/config/suspender");
  revalidatePath("/config");
  revalidatePath("/inicio");
  revalidatePath("/convocatoria");
  revalidatePath("/ranking");

  return { ok: true, message: `Fecha ${match.number} suspendida` };
}

export async function reactivarFecha(
  matchId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede reactivar fechas" };
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, number, status, group_id")
    .eq("id", matchId)
    .eq("group_id", membership.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };
  if (match.status !== "suspendida") {
    return { ok: false, error: "El partido no está suspendido" };
  }

  const { error } = await supabase
    .from("matches")
    .update({ status: "programada" })
    .eq("id", matchId);

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al reactivar la fecha" };
  }

  await supabase.from("corrections").insert({
    group_id: membership.group_id,
    entity: "otro",
    entity_id: matchId,
    description: `▶️ Se reactivó la Fecha ${match.number} (antes suspendida).`,
    after_data: { status: "programada" },
    by_user_id: user.id,
  });

  revalidatePath("/config/suspender");
  revalidatePath("/config");
  revalidatePath("/inicio");
  revalidatePath("/convocatoria");

  return { ok: true, message: `Fecha ${match.number} reactivada` };
}