"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

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

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

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
// ────────────────────────────────────────────────────────────────
// Eliminar definitivamente del grupo (borra TODO el historial en cascada)
// ────────────────────────────────────────────────────────────────
export async function eliminarDefinitivo(
  memberId: string
): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  // Verificar que el miembro pertenece al grupo
  const { data: miembro } = await supabase
    .from("group_members")
    .select("id, display_name, status")
    .eq("id", memberId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (!miembro) return { ok: false, error: "Miembro no encontrado" };

  if (miembro.status !== "baja") {
    return {
      ok: false,
      error: "Solo se pueden eliminar definitivamente a miembros dados de baja primero. Usá Suspender.",
    };
  }

  // Registrar en el historial de correcciones ANTES de borrar
  await supabase.from("corrections").insert({
    group_id: groupId,
    entity: "otro",
    entity_id: memberId,
    description: `🗑️ Se eliminó definitivamente del grupo a ${miembro.display_name}. Todo su historial fue borrado.`,
    before_data: { display_name: miembro.display_name, status: miembro.status },
  });

  // Borrar (cascade elimina todo lo relacionado)
  const { error: err } = await supabase
    .from("group_members")
    .delete()
    .eq("id", memberId)
    .eq("group_id", groupId);

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al eliminar" };
  }

  revalidatePath("/config/plantel");
  revalidatePath("/inicio");
  revalidatePath("/ranking");
  revalidatePath("/convocatoria");
  return {
    ok: true,
    message: `${miembro.display_name} eliminado del grupo`,
  };
}