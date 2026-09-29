"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  anotarse,
  darseDeBaja,
  type ActionResult,
} from "../convocatoria/actions";

type Props = {
  matchId: string;
  miEstado: string | null;
  cupo: number;
  anotadosCount: number;
  bajaCerrada: boolean;
  completo: boolean;
};

export default function BotonAnotarse({
  matchId,
  miEstado,
  cupo,
  anotadosCount,
  bajaCerrada,
  completo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const yoAnotado = miEstado === "anotado" || miEstado === "presente";
  const yoEspera = miEstado === "lista_espera";

  function ejecutar() {
    startTransition(async () => {
      const fn = yoAnotado || yoEspera ? darseDeBaja : anotarse;
      const res: ActionResult = await fn(matchId);
      if (!res.ok) setToast(res.error ?? "Error");
      else setToast(res.message ?? "Listo");
      setTimeout(() => setToast(null), 2500);
      router.refresh();
    });
  }

  // Textos
  let textoBoton = "Anotarme";
  if (isPending) textoBoton = "...";
  else if (yoAnotado) textoBoton = "✓ Estás anotado · Darme de baja";
  else if (yoEspera) textoBoton = "En lista de espera · Salir";
  else if (completo) textoBoton = "Anotarme en lista de espera";

  return (
    <>
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      {!bajaCerrada && (
        <button
          type="button"
          onClick={ejecutar}
          disabled={isPending}
          className="mt-3 w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-50"
          style={{
            background: yoAnotado || yoEspera ? "transparent" : "var(--or)",
            color: yoAnotado || yoEspera ? "var(--gold)" : "#fff",
            border: yoAnotado || yoEspera ? "1px solid var(--gold)" : "none",
          }}
        >
          {textoBoton}
        </button>
      )}

      {bajaCerrada && (
        <div
          className="mt-3 rounded-xl border py-3 text-center text-xs font-bold"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--dim)" }}
        >
          🔒 Ventana de baja cerrada
        </div>
      )}

      <Link
        href="/convocatoria"
        className="mt-2 block text-center text-xs font-medium no-underline"
        style={{ color: "var(--gold)" }}
      >
        Ver convocatoria y armar equipo →
      </Link>

      <div className="mt-1 text-center text-[10px]" style={{ color: "var(--dim)" }}>
        {anotadosCount} de {cupo} anotados
        {completo && " · completo"}
      </div>
    </>
  );
}