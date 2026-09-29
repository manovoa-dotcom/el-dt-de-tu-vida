"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
};

// Marca todas las noticias del grupo como leídas para el miembro actual
export async function marcarTodasLeidas(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: miembro } = await supabase
    .from("group_members")
    .select("id, group_id")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!miembro) return { ok: false, error: "No activo" };

  // Traer todas las noticias del grupo
  const { data: noticias } = await supabase
    .from("news")
    .select("id")
    .eq("group_id", miembro.group_id);

  if (!noticias || noticias.length === 0) return { ok: true };

  // Traer las que ya están leídas
  const { data: yaLeidas } = await supabase
    .from("news_reads")
    .select("news_id")
    .eq("member_id", miembro.id)
    .in("news_id", noticias.map((n) => n.id));

  const leidasSet = new Set((yaLeidas ?? []).map((r) => r.news_id));

  // Insertar las que faltan
  const faltantes = noticias
    .filter((n) => !leidasSet.has(n.id))
    .map((n) => ({ member_id: miembro.id, news_id: n.id }));

  if (faltantes.length > 0) {
    await supabase.from("news_reads").insert(faltantes);
  }

  revalidatePath("/inicio");
  return { ok: true };
}