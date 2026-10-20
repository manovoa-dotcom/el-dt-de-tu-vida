"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

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

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

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

  // Buscar el nombre del jugador y el número de fecha
  const { data: jugador } = await supabase
    .from("group_members")
    .select("display_name")
    .eq("id", card.member_id)
    .maybeSingle();

  const { data: partido } = await supabase
    .from("matches")
    .select("number")
    .eq("id", card.match_id)
    .maybeSingle();

  const nombreJugador = jugador?.display_name ?? "un jugador";
  const numeroFecha = partido?.number ?? "?";

  const { error: errCorr } = await supabase.from("corrections").insert({
    group_id: membership.group_id,
    entity: "tarjeta",
    entity_id: cardId,
    description: `🟥 Se anuló la tarjeta roja de ${nombreJugador} (Fecha ${numeroFecha}). Motivo: ${razon}`,
    after_data: {
      annulled: true,
      annul_reason: razon,
      member_name: nombreJugador,
      match_number: numeroFecha,
    },
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
  revalidatePath("/config/correcciones");
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

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede rehabilitar tarjetas" };
  }

  const { data: card } = await supabase
    .from("cards")
    .select("id, member_id, match_id, annul_reason")
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

  // Buscar el nombre del jugador y el número de fecha
  const { data: jugador } = await supabase
    .from("group_members")
    .select("display_name")
    .eq("id", card.member_id)
    .maybeSingle();

  const { data: partido } = await supabase
    .from("matches")
    .select("number")
    .eq("id", card.match_id)
    .maybeSingle();

  const nombreJugador = jugador?.display_name ?? "un jugador";
  const numeroFecha = partido?.number ?? "?";

  const { error: errCorr } = await supabase.from("corrections").insert({
    group_id: membership.group_id,
    entity: "tarjeta",
    entity_id: cardId,
    description: `✅ Se rehabilitó la tarjeta roja de ${nombreJugador} (Fecha ${numeroFecha}).`,
    before_data: {
      annulled: true,
      annul_reason: card.annul_reason,
      member_name: nombreJugador,
      match_number: numeroFecha,
    },
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
  revalidatePath("/config/correcciones");
  return { ok: true, message: "Tarjeta rehabilitada" };
}