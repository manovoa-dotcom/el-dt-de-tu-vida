import webpush from "web-push";
import { createClient } from "./supabase/server";

// ⚠️ Valores hardcodeados para evitar problemas con la carga de env vars en Vercel
const VAPID_PUBLIC_KEY =
  "BCXuQyvlUFx8LkX3EW1F6BAVdnKysPQ-SekSFc6ItZwKkKMp474RMll4chooH-F5ZJwJGUsE59YoSrBwvsBt_eM";

const VAPID_PRIVATE_KEY =
  "MOP6QkVwC7xPp8YgGLdw_Sb0yXE2KsCITobWtlZks4E";

const VAPID_SUBJECT = "mailto:manovoa@gmail.com";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function enviarNotificacion(
  userIds: string[],
  payload: PushPayload
) {
  console.log("[PUSH] Iniciando envío a", userIds.length, "usuarios");
  console.log("[PUSH] userIds:", userIds);

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  if (userIds.length === 0) {
    console.log("[PUSH] No hay usuarios para enviar");
    return;
  }

    const supabase = await createClient();
  const { data: subs, error: errSubs } = await supabase.rpc(
    "get_push_subs_for_users",
    { p_user_ids: userIds }
  );

  if (errSubs) {
    console.error("[PUSH] Error leyendo suscripciones:", errSubs);
    return;
  }

  console.log("[PUSH] Suscripciones encontradas:", subs?.length ?? 0);

  if (!subs || subs.length === 0) {
    console.log("[PUSH] No hay suscripciones para esos usuarios");
    return;
  }

      const subsTyped = subs as { endpoint: string; keys: unknown }[];

  const promesas = subsTyped.map(
    (sub: { endpoint: string; keys: unknown }, idx: number) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys as { p256dh: string; auth: string },
          },
          JSON.stringify(payload)
        )
        .then(() => {
          console.log(`[PUSH] ✅ Enviado a suscripción ${idx + 1}`);
        })
        .catch((err) => {
          console.error(
            `[PUSH] ❌ Error en suscripción ${idx + 1}:`,
            err.statusCode,
            err.body
          );
          if (err.statusCode === 410) {
            supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        })
  );

  await Promise.allSettled(promesas);
  console.log("[PUSH] Envío terminado");
}

// ────────────────────────────────────────────────────────────────
// Helper: obtener los user_ids de todos los miembros activos del grupo
// ────────────────────────────────────────────────────────────────
export async function getUserIdDeMiembros(
  groupId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("status", "activo")
    .not("user_id", "is", null);

  return (data ?? [])
    .map((m) => m.user_id)
    .filter((x): x is string => !!x);
}

// ────────────────────────────────────────────────────────────────
// Helper: obtener los user_ids de una lista de member_ids
// ────────────────────────────────────────────────────────────────
export async function getUserIdsDeMembers(
  memberIds: string[]
): Promise<string[]> {
  if (memberIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("user_id")
    .in("id", memberIds)
    .not("user_id", "is", null);

  return (data ?? [])
    .map((m) => m.user_id)
    .filter((x): x is string => !!x);
}