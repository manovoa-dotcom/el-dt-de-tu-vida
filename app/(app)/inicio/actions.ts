"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

async function getMiembroActivo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, miembro: null, user: null, error: "No autenticado" };

  const { data: miembro } = await supabase
    .from("group_members")
    .select("id, group_id")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!miembro) return { supabase, miembro: null, user, error: "No estás activo" };

  return { supabase, miembro, user, error: null };
}

// Publicar noticia libre
export async function publicarNoticia(texto: string): Promise<ActionResult> {
  const { supabase, miembro, user, error } = await getMiembroActivo();
  if (error || !miembro || !user) return { ok: false, error: error ?? "Error" };

  const trimmed = texto.trim();
  if (trimmed.length < 2) return { ok: false, error: "El mensaje es muy corto" };
  if (trimmed.length > 500) return { ok: false, error: "Máximo 500 caracteres" };

  const { error: err } = await supabase.from("news").insert({
    group_id: miembro.group_id,
    kind: "usuario",
    title: trimmed,
    author_id: user.id,
  });

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al publicar" };
  }

  revalidatePath("/inicio");
  return { ok: true, message: "Publicado" };
}

// Reaccionar (toggle)
export async function toggleReaccion(
  newsId: string,
  emoji: string
): Promise<ActionResult> {
  const { supabase, miembro, error } = await getMiembroActivo();
  if (error || !miembro) return { ok: false, error: error ?? "Error" };

  const { data: existente } = await supabase
    .from("reactions")
    .select("id")
    .eq("news_id", newsId)
    .eq("member_id", miembro.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existente) {
    const { error: err } = await supabase
      .from("reactions")
      .delete()
      .eq("id", existente.id);
    if (err) return { ok: false, error: "Error al quitar la reacción" };
  } else {
    const { error: err } = await supabase.from("reactions").insert({
      news_id: newsId,
      member_id: miembro.id,
      emoji,
    });
    if (err) return { ok: false, error: "Error al reaccionar" };
  }

  revalidatePath("/inicio");
  return { ok: true };
}