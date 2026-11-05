"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function actualizarAliasPerfil(
  alias: string
): Promise<{ ok: boolean; error?: string }> {
  const displayName = alias.trim();
  if (displayName.length < 2) {
    return { ok: false, error: "El alias debe tener al menos 2 caracteres" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Tenés que iniciar sesión" };

  const { error } = await supabase.rpc("actualizar_alias_perfil", {
    p_display_name: displayName,
  });

  if (error) {
    console.error("Error actualizando alias del perfil:", error);
    return { ok: false, error: error.message };
  }

  for (const path of [
    "/perfil",
    "/inicio",
    "/ranking",
    "/resultados",
    "/elecciones",
    "/convocatoria",
    "/config/plantel",
    "/config/partido",
    "/config/resultados",
    "/config/cierre",
    "/config/correcciones",
    "/config/elecciones",
  ]) {
    revalidatePath(path);
  }

  return { ok: true };
}
