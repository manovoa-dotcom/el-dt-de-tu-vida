import { createClient } from "@/lib/supabase/server";

type NoticiaInput = {
  groupId: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
};

// Genera una noticia automática (kind = 'auto')
export async function crearNoticiaAuto({
  groupId,
  title,
  body,
  payload,
}: NoticiaInput): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("news").insert({
      group_id: groupId,
      kind: "auto",
      title,
      body: body ?? null,
      payload: payload ?? null,
    });
  } catch (err) {
    // No bloqueamos la acción si falla la noticia
    console.error("Error creando noticia automática:", err);
  }
}