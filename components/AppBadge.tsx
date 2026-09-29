"use client";

import { useEffect } from "react";

// Sincroniza el badge del sistema operativo (ícono de la app)
// con el número de noticias no leídas.
// Solo funciona en Chrome Android. En iPhone no hace nada (se ignora).
export default function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    // @ts-expect-error: setAppBadge no está en los tipos de TS estándar
    if (!("setAppBadge" in navigator)) return;

    try {
      if (count > 0) {
        // @ts-expect-error: setAppBadge
        navigator.setAppBadge(count);
      } else {
        // @ts-expect-error: clearAppBadge
        navigator.clearAppBadge?.();
      }
    } catch {
      // Silencioso: si falla, no rompemos la app
    }
  }, [count]);

  return null;
}