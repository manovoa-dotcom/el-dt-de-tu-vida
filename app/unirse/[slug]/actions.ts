"use server";

import { createClient } from "@/lib/supabase/server";
import { enviarNotificacion } from "@/lib/push";

export async function notificarNuevoPendiente(
  groupId: string,
  alias: string
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // Obtener admins del grupo (via RPC que bypassea RLS)
  const { data: admins } = await supabase.rpc("get_admin_user_ids", {
    p_group_id: groupId,
  });

  const userIds = (admins ?? [])
    .map((a: { user_id: string }) => a.user_id)
    .filter((x: string) => !!x);

  if (userIds.length === 0) return { ok: true };

  await enviarNotificacion(userIds, {
    title: "👤 Nueva solicitud de ingreso",
    body: `${alias} quiere unirse al juego. Aprobala desde Config → Plantel.`,
    url: "/config/plantel",
  });

  return { ok: true };
}