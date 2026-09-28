"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  ok: boolean;
  error?: string;
};

// Convierte "2026-09-26T20:00" (datetime-local en hora AR) a ISO UTC.
// Asumimos que el grupo está en America/Argentina/Buenos_Aires (UTC-3).
function localToUtcIso(local: string): string {
  // El input datetime-local no incluye zona horaria. Le agregamos -03:00
  // y lo convertimos a UTC.
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

  // Verificar admin
  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "No tenés permisos de admin" };
  }
  const groupId = membership.group_id;

  // Leer form
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

  // Calcular ventanas
  const kickoffUtc = localToUtcIso(kickoffLocal);
  const kickoffDate = new Date(kickoffUtc);
  const bajaCloses = new Date(kickoffDate.getTime() - 3 * 60 * 60 * 1000);
  const teamsLock = new Date(kickoffDate.getTime() - 10 * 60 * 1000);

  // Convocatoria abre: el próximo día+hora configurado del grupo, ANTES del kickoff.
  const { data: grupo } = await supabase
    .from("groups")
    .select("convocatoria_dow, convocatoria_time")
    .eq("id", groupId)
    .single();

  const convDow = grupo?.convocatoria_dow ?? 1;
  const convTime = grupo?.convocatoria_time ?? "10:00";

  // Buscar el próximo día de la semana configurado, en las últimas 2 semanas
  let convOpen = new Date(kickoffDate);
  for (let i = 0; i < 14; i++) {
    convOpen.setUTCDate(convOpen.getUTCDate() - 1);
    if (convOpen.getUTCDay() === convDow) break;
  }
  // Setear la hora configurada (en AR = UTC-3)
  const [hh, mm] = convTime.split(":").map((x) => parseInt(x, 10));
  const convOpenStr = `${convOpen.toISOString().slice(0, 10)}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00-03:00`;
  const convOpenUtc = new Date(convOpenStr).toISOString();

if (matchId) {
  // Actualizar partido existente
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

  
  } else {
    // Crear nuevo partido
    // Verificar temporada activa
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("group_id", groupId)
      .eq("status", "activa")
      .maybeSingle();

    if (!season) {
      return { ok: false, error: "No hay temporada activa" };
    }

    // Número de fecha = último + 1
    const { data: lastMatch } = await supabase
      .from("matches")
      .select("number")
      .eq("season_id", season.id)
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const numero = (lastMatch?.number ?? 0) + 1;

    const { error } = await supabase.from("matches").insert({
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
    });

    if (error) {
      console.error(error);
      return { ok: false, error: "Error al crear. Probá de nuevo." };
    }
  }

  revalidatePath("/inicio");
  revalidatePath("/config");
  revalidatePath("/config/partido");
  redirect("/inicio");
}

export async function eliminarPartido(matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

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