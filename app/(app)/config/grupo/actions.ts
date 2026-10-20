"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

type ConfigInput = {
  name: string;
  presentismo_value: number;
  dt_pick_value: number;
  equipo_ideal_value: number;
  equipo_ideal_anio_size: number;
};

export async function guardarConfigGrupo(
  input: ConfigInput
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

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "El nombre es muy corto" };

  if (
    input.presentismo_value < 0 ||
    input.dt_pick_value < 0 ||
    input.equipo_ideal_value < 0
  ) {
    return { ok: false, error: "Los valores no pueden ser negativos" };
  }

   if (input.equipo_ideal_anio_size < 5 || input.equipo_ideal_anio_size > 11) {
    return { ok: false, error: "El Equipo Ideal del Año debe tener entre 5 y 11 jugadores" };
  }

   const { error } = await supabase
    .from("groups")
    .update({
      name,
      presentismo_value: input.presentismo_value,
      dt_pick_value: input.dt_pick_value,
      equipo_ideal_value: input.equipo_ideal_value,
      equipo_ideal_anio_size: input.equipo_ideal_anio_size,
    })
    .eq("id", membership.group_id);

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al guardar" };
  }

  // Recalcular valor de mercado del próximo partido automáticamente
  const { data: proximo } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "programada")
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (proximo) {
    await supabase.rpc("calcular_valor_mercado", {
      p_match_id: proximo.id,
    });
  }

  revalidatePath("/config/grupo");
  revalidatePath("/config");
  revalidatePath("/inicio");
  revalidatePath("/convocatoria");

  return { ok: true, message: "Configuración guardada y valores recalculados" };
}

// Fuerza el recálculo del valor de mercado del próximo partido programado
export async function recalcularValores(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "No tenés permisos de admin" };
  }

  const { data: proximo } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "programada")
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!proximo) {
    return { ok: false, error: "No hay partido programado para recalcular" };
  }

  const { error } = await supabase.rpc("calcular_valor_mercado", {
    p_match_id: proximo.id,
  });

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al recalcular" };
  }

  revalidatePath("/config/grupo");
  revalidatePath("/convocatoria");

  return { ok: true, message: "Valores recalculados" };
}