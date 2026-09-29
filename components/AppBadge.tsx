"use client";

import { useEffect } from "react";

// Sincroniza el badge del sistema operativo (ícono de la app)
// con el número de noticias no leídas.
// Solo funciona en Chrome Android. En iPhone no hace nada (se ignora).
export default function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };

    if (typeof nav.setAppBadge !== "function") return;

    try {
      if (count > 0) {
        nav.setAppBadge(count);
      } else if (typeof nav.clearAppBadge === "function") {
        nav.clearAppBadge();
      }
    } catch {
      // Silencioso: si falla, no rompemos la app
    }
  }, [count]);

  return null;
}