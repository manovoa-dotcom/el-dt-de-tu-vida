import { createClient } from "@/lib/supabase/server";

// Devuelve una frase no usada de la categoría, y la marca como usada.
// Si ya se usaron todas, resetea y empieza de nuevo.
export async function getFraseNoUsada(category: string): Promise<string | null> {
  const supabase = await createClient();

  // 1. Buscar una no usada
  const { data: candidatas } = await supabase
    .from("phrases")
    .select("id, text")
    .eq("category", category)
    .is("used_at", null)
    .limit(50);

  let elegida: { id: string; text: string } | null = null;

  if (candidatas && candidatas.length > 0) {
    // Elegir una al azar del pool
    elegida = candidatas[Math.floor(Math.random() * candidatas.length)];
  } else {
    // Todas usadas: resetear y volver a empezar
    await supabase
      .from("phrases")
      .update({ used_at: null })
      .eq("category", category);

    const { data: reseteadas } = await supabase
      .from("phrases")
      .select("id, text")
      .eq("category", category)
      .limit(50);

    if (reseteadas && reseteadas.length > 0) {
      elegida = reseteadas[Math.floor(Math.random() * reseteadas.length)];
    }
  }

  if (!elegida) return null;

  // Marcar como usada
  await supabase
    .from("phrases")
    .update({ used_at: new Date().toISOString() })
    .eq("id", elegida.id);

  return elegida.text;
}