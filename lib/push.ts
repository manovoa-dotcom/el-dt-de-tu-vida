import webpush from "web-push";
import { createClient } from "./supabase/server";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function enviarNotificacion(
  userIds: string[],
  payload: PushPayload
) {
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