import webpush from "web-push";
import { createClient } from "./supabase/server";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function enviarNotificacion(
  userIds: string[],
  payload: PushPayload
) {
  // Configurar VAPID cada vez (por si el build no tiene las env vars)
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:manovoa@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
  );

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