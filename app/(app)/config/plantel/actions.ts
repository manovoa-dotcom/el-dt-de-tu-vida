"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, groupId: null, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return { supabase, groupId: null, error: "No tenés permisos de admin" };
  }

  return { supabase, groupId: membership.group_id, error: null };
}

// ────────────────────────────────────────────────────────────────
// Aprobar un miembro pendiente
// ────────────────────────────────────────────────────────────────
export async function aprobarMiembro(memberId: string): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: err } = await supabase
    .from("group_members")
    .update({ status: "activo" })
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al aprobar" };
  }

  revalidatePath("/config/plantel");
  revalidatePath("/config");
  return { ok: true, message: "Miembro aprobado" };
}

// ────────────────────────────────────────────────────────────────
// Rechazar (dar de baja) un miembro pendiente
// ────────────────────────────────────────────────────────────────
export async function rechazarPendiente(memberId: string): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: err } = await supabase
    .from("group_members")
    .update({ status: "baja", left_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al rechazar" };
  }

  revalidatePath("/config/plantel");
  return { ok: true, message: "Solicitud rechazada" };
}

// ────────────────────────────────────────────────────────────────
// Suspender un miembro activo (y limpiar asistencias futuras)
// ────────────────────────────────────────────────────────────────
export async function suspenderMiembro(memberId: string): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: err } = await supabase
    .from("group_members")
    .update({ status: "suspendido" })
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al suspender" };
  }

  // Limpiar asistencias futuras
  const { data: partidosFuturos } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "programada");

  if (partidosFuturos && partidosFuturos.length > 0) {
    const ids = partidosFuturos.map((p) => p.id);
    await supabase
      .from("attendance")
      .delete()
      .in("match_id", ids)
      .eq("member_id", memberId);

    const { data: teams } = await supabase
      .from("fantasy_teams")
      .select("id")
      .in("match_id", ids);

    const teamIds = (teams ?? []).map((t) => t.id);
    if (teamIds.length > 0) {
      await supabase
        .from("fantasy_picks")
        .delete()
        .in("team_id", teamIds)
        .eq("member_id", memberId);
    }
  }

  revalidatePath("/config/plantel");
  revalidatePath("/convocatoria");
  revalidatePath("/inicio");
  return { ok: true, message: "Miembro suspendido" };
}

// ────────────────────────────────────────────────────────────────
// Rehabilitar un miembro suspendido
// ────────────────────────────────────────────────────────────────
export async function rehabilitarMiembro(memberId: string): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: err } = await supabase
    .from("group_members")
    .update({ status: "activo" })
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al rehabilitar" };
  }

  revalidatePath("/config/plantel");
  return { ok: true, message: "Miembro rehabilitado" };
}

// ────────────────────────────────────────────────────────────────
// Dar de baja definitiva (archiva y limpia asistencias futuras)
// ────────────────────────────────────────────────────────────────
export async function darDeBaja(memberId: string): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: err } = await supabase
    .from("group_members")
    .update({ status: "baja", left_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al dar de baja" };
  }

  // Limpiar asistencias futuras
  const { data: partidosFuturos } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "programada");

  if (partidosFuturos && partidosFuturos.length > 0) {
    const ids = partidosFuturos.map((p) => p.id);
    await supabase
      .from("attendance")
      .delete()
      .in("match_id", ids)
      .eq("member_id", memberId);

    const { data: teams } = await supabase
      .from("fantasy_teams")
      .select("id")
      .in("match_id", ids);

    const teamIds = (teams ?? []).map((t) => t.id);
    if (teamIds.length > 0) {
      await supabase
        .from("fantasy_picks")
        .delete()
        .in("team_id", teamIds)
        .eq("member_id", memberId);
    }
  }

  revalidatePath("/config/plantel");
  revalidatePath("/convocatoria");
  revalidatePath("/inicio");
  return { ok: true, message: "Miembro dado de baja" };
}

// ────────────────────────────────────────────────────────────────
// Agregar invitado
// ────────────────────────────────────────────────────────────────
export async function agregarInvitado(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const alias = String(formData.get("alias") || "").trim();
  if (alias.length < 2) return { ok: false, error: "El alias es muy corto" };

  const { data: existente } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .ilike("display_name", alias)
    .neq("status", "baja")
    .maybeSingle();

  if (existente) {
    return { ok: false, error: "Ya existe alguien con ese alias en el grupo" };
  }

  const { error: err } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: null,
    display_name: alias,
    role: "miembro",
    status: "invitado",
  });

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al agregar invitado" };
  }

  revalidatePath("/config/plantel");
  return { ok: true, message: `Invitado "${alias}" agregado` };
}