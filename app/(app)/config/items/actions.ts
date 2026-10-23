"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

type ItemUpdate = {
  id: string;
  active: boolean;
  points: number;
};

type NewItem = {
  label: string;
  selection_type: "multiple" | "unica";
  points: number;
};

export async function crearItem(item: NewItem): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);
  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "No tenés permisos de admin" };
  }

  const label = item.label.trim();
  if (label.length < 2 || label.length > 60) {
    return { ok: false, error: "El nombre debe tener entre 2 y 60 caracteres" };
  }
  if (item.selection_type !== "multiple" && item.selection_type !== "unica") {
    return { ok: false, error: "Tipo de selección inválido" };
  }
  if (!Number.isSafeInteger(item.points) || item.points < 0) {
    return { ok: false, error: "Los puntos deben ser un entero no negativo" };
  }

  const ahora = new Date().toISOString();
  const { data: partidoActivo } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "programada")
    .gt("kickoff_at", ahora)
    .limit(1)
    .maybeSingle();

  if (partidoActivo) {
    return {
      ok: false,
      error: "No se pueden modificar los ítems con un partido en curso. Esperá a que se juegue la fecha.",
    };
  }

  const { data: existentes, error: errorItems } = await supabase
    .from("items")
    .select("sort_order")
    .eq("group_id", membership.group_id);

  if (errorItems) {
    console.error(errorItems);
    return { ok: false, error: "No se pudo preparar el nuevo ítem" };
  }

  const sortOrder = Math.max(0, ...(existentes ?? []).map((i) => i.sort_order ?? 0)) + 1;
  const { error } = await supabase.from("items").insert({
    group_id: membership.group_id,
    key: `custom_${crypto.randomUUID().replaceAll("-", "")}`,
    label,
    selection_type: item.selection_type,
    points: item.points,
    active: true,
    sort_order: sortOrder,
  });

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al crear el ítem" };
  }

  revalidatePath("/config/items");
  revalidatePath("/config");
  revalidatePath("/config/resultados");
  revalidatePath("/resultados");
  revalidatePath("/ranking");

  return { ok: true, message: "Ítem agregado" };
}

export async function guardarItems(
  items: ItemUpdate[]
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

  // Verificar que no haya un partido programado pendiente
  const ahora = new Date().toISOString();
  const { data: partidoActivo } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "programada")
    .gt("kickoff_at", ahora)
    .limit(1)
    .maybeSingle();

  if (partidoActivo) {
    return {
      ok: false,
      error: "No se pueden modificar los ítems con un partido en curso. Esperá a que se juegue la fecha.",
    };
  }

  const activos = items.filter((i) => i.active);
  if (activos.length < 4) {
    return { ok: false, error: "Necesitás al menos 4 ítems activos" };
  }

  for (const it of items) {
    if (it.points < 0) {
      return { ok: false, error: "Los puntos no pueden ser negativos" };
    }
  }
  for (const it of items) {
    const { error } = await supabase
      .from("items")
      .update({ active: it.active, points: it.points })
      .eq("id", it.id)
      .eq("group_id", membership.group_id);

    if (error) {
      console.error(error);
      return { ok: false, error: "Error al guardar" };
    }
  }

  revalidatePath("/config/items");
  revalidatePath("/config");
  revalidatePath("/resultados");
  revalidatePath("/ranking");

  return { ok: true, message: "Ítems actualizados" };
}
