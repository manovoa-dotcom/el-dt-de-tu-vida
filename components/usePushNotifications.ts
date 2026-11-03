"use client";

import { useState, useEffect, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  useEffect(() => {
    if (!isSupported) {
        const timeout = setTimeout(() => {
          setPermission("unsupported");
          setLoading(false);
        }, 0);
        return () => clearTimeout(timeout);
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
        if (cancelled) return;
        setPermission(Notification.permission);
        setLoading(false);
    }, 3000);

    navigator.serviceWorker
        .ready.then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (cancelled) return;
          setSubscription(sub);
          setPermission(Notification.permission);
          clearTimeout(timeout);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error("Error verificando suscripción:", err);
          setPermission(Notification.permission);
          clearTimeout(timeout);
          setLoading(false);
        });

    const actualizarSuscripcion = () => {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.ready
          .then((reg) => reg.pushManager.getSubscription())
          .then((sub) => {
            if (!cancelled) setSubscription(sub);
          })
          .catch((err) => console.error("Error verificando suscripción:", err));
    };
    window.addEventListener("push-subscription-changed", actualizarSuscripcion);
    return () => {
        cancelled = true;
        clearTimeout(timeout);
        window.removeEventListener("push-subscription-changed", actualizarSuscripcion);
    };
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    setError(null);
    if (!isSupported) {
      setError("Tu navegador no soporta notificaciones");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== "granted") {
        setError("No diste permiso para las notificaciones");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
          "BCXuQyvlUFx8LkX3EW1F6BAVdnKysPQ-SekSFc6ItZwKkKMp474RMll4chooH-F5ZJwJGUsE59YoSrBwvsBt_eM"
        ),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      if (!res.ok) {
        setError("Error al guardar la suscripción");
        return;
      }

      setSubscription(sub);
      window.dispatchEvent(new Event("push-subscription-changed"));
    } catch (err) {
      console.error(err);
      setError("Error al activar las notificaciones");
    }
  }, [isSupported]);

  return { isSupported, subscription, loading, error, permission, subscribe };
}