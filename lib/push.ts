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
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  if (userIds.length === 0) return;

  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, keys")
    .in("user_id", userIds);

  if (!subs || subs.length === 0) return;

  const promesas = subs.map((sub) =>
    webpush
      .sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        },
        JSON.stringify(payload)
      )
      .catch((err) => {
        console.error("Error enviando push:", err.statusCode, err.body);
        if (err.statusCode === 410) {
          supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      })
  );

  await Promise.allSettled(promesas);
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