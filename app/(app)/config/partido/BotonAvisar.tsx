"use client";

import { useState, useTransition } from "react";
import { avisarConvocatoria } from "./actions";

export default function BotonAvisar({ matchId }: { matchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  function handleAvisar() {
    startTransition(async () => {
      const res = await avisarConvocatoria(matchId);
      if (res.ok) {
        setToast(res.message ?? "Aviso enviado");
        setConfirmar(false);
      } else {
        setToast(res.error ?? "Error");
      }
      setTimeout(() => setToast(null), 3000);
    });
  }

  return (
    <div className="mx-3 mt-5">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(242,182,50,0.08)",
          border: "1px solid rgba(242,182,50,0.3)",
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">📢</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold" style={{ color: "var(--gold)" }}>
              Avisar que abrió la convocatoria
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
              Envía una notificación push a todos los miembros activos para que
              se anoten al partido.
            </p>
          </div>
        </div>

        {!confirmar ? (
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            className="mt-3 w-full rounded-xl py-3 text-sm font-bold transition"
            style={{ background: "var(--or)", color: "#fff" }}
          >
            📢 Avisar al grupo
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              disabled={isPending}
              className="flex-1 rounded-xl border py-2 text-xs font-bold"
              style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--dim)" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAvisar}
              disabled={isPending}
              className="flex-1 rounded-xl py-2 text-xs font-bold disabled:opacity-50"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              {isPending ? "Enviando..." : "Sí, avisar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}