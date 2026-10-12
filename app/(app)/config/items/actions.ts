"use server";

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

export async function guardarItems(
  items: ItemUpdate[]
): Promise<ActionResult> {
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