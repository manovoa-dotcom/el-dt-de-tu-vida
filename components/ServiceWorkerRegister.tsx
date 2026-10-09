"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registrado:", reg.scope);
        })
        .catch((err) => console.error("SW registration failed:", err));
    };

    // Si la página ya cargó, registrar directo. Si no, esperar al load.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}