"use server";

import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";

export type CrearInvitacionResult = {
  ok: boolean;
  token?: string;
  error?: string;
};

export async function crearInvitacionAdminGrupo(
  nombreGrupo: string
): Promise<CrearInvitacionResult> {
  const nombre = nombreGrupo.trim();
  if (nombre.length < 2 || nombre.length > 40) {
    return { ok: false, error: "El nombre debe tener entre 2 y 40 caracteres" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPlatformAdmin(user.email)) {
    return { ok: false, error: "No tenés permiso para crear esta invitación" };
  }

  const { data: token, error } = await supabase.rpc("create_admin_group_invite", {
    p_group_name: nombre,
  });

  if (error || typeof token !== "string") {
    console.error("Error creando invitación de grupo:", error);
    return {
      ok: false,
      error: error?.message ?? "No se pudo crear la invitación. Probá de nuevo.",
    };
  }

  return { ok: true, token };
}
