"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { marcarTodasLeidas } from "../actions";

// Cuando el usuario entra a Inicio, espera 2 segundos y marca
// todas las noticias como leídas. El delay evita marcarlas si el
// usuario entra y sale rápido sin mirarlas.
export default function MarcarComoLeidas() {
  const router = useRouter();
  const ejecutado = useRef(false);

  useEffect(() => {
    if (ejecutado.current) return;
    ejecutado.current = true;

    const timer = setTimeout(async () => {
      const res = await marcarTodasLeidas();
      if (res.ok) {
        router.refresh();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}