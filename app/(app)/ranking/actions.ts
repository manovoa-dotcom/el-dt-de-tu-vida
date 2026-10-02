"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function anularTarjeta(
  cardId: string,
  motivo: string
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
    return { ok: false, error: "Solo el admin puede anular tarjetas" };
  }

  const razon = motivo.trim();
  if (razon.length < 3) {
    return { ok: false, error: "Poné un motivo (mínimo 3 caracteres)" };
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id, member_id, match_id")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) return { ok: false, error: "Tarjeta no encontrada" };

  const { error } = await supabase
    .from("cards")
    .update({
      annulled: true,
      annulled_by: user.id,
      annulled_at: new Date().toISOString(),
      annul_reason: razon,
    })
    .eq("id", cardId);

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al anular la tarjeta" };
  }

     // Registrar en historial público de correcciones
  const { error: errCorr } = await supabase.from("corrections").insert({
    group_id: membership.group_id,
    entity: "tarjeta",
    entity_id: cardId,
    description: `Se anuló una tarjeta roja. Motivo: ${razon}`,
    after_data: { annulled: true, annul_reason: razon },
    by_user_id: user.id,
  });

  if (errCorr) {
    console.error("Error insertando corrección:", errCorr);
    return {
      ok: false,
      error: `Tarjeta anulada pero NO se registró en historial: ${errCorr.message}`,
    };
  }
  revalidatePath("/ranking");
  return { ok: true, message: "Tarjeta anulada" };
}

export async function rehabilitarTarjeta(
  cardId: string
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
    return { ok: false, error: "Solo el admin puede rehabilitar tarjetas" };
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id, annul_reason")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) return { ok: false, error: "Tarjeta no encontrada" };

  const { error } = await supabase
    .from("cards")
    .update({
      annulled: false,
      annulled_by: null,
      annulled_at: null,
      annul_reason: null,
    })
    .eq("id", cardId);

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al rehabilitar la tarjeta" };
  }

   const { error: errCorr } = await supabase.from("corrections").insert({
    group_id: membership.group_id,
    entity: "tarjeta",
    entity_id: cardId,
    description: `Se rehabilitó una tarjeta roja (antes anulada).`,
    before_data: { annulled: true, annul_reason: card.annul_reason },
    after_data: { annulled: false },
    by_user_id: user.id,
  });

  if (errCorr) {
    console.error("Error insertando corrección:", errCorr);
    return {
      ok: false,
      error: `Tarjeta rehabilitada pero NO se registró en historial: ${errCorr.message}`,
    };
  }

  revalidatePath("/ranking");
  return { ok: true, message: "Tarjeta rehabilitada" };
}