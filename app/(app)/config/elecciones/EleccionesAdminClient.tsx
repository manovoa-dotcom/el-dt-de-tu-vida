"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  convocarElecciones,
  cerrarElecciones,
  cancelarEleccion,
} from "./actions";

type Eleccion = {
  id: string;
  round: number;
  motivo: string | null;
  closes_at: string;
  status: string;
  opens_at: string;
};

export default function EleccionesAdminClient({
  eleccion,
  votosCount,
  totalActivos,
}: {
  eleccion: Eleccion | null;
  votosCount: number;
  totalActivos: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    texto: string;
    tipo: "ok" | "error";
  } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  function mostrarToast(texto: string, tipo: "ok" | "error" = "ok") {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  function handleConvocar() {
    startTransition(async () => {
      const res = await convocarElecciones(motivo);
      if (res.ok) {
        setMotivo("");
        setConfirmando(false);
        mostrarToast(res.message ?? "Convocadas");
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error", "error");
      }
    });
  }

  function handleCerrar() {
    if (!eleccion) return;
    startTransition(async () => {
      const res = await cerrarElecciones(eleccion.id);
      if (res.ok) {
        mostrarToast(res.message ?? "Cerrada");
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error", "error");
      }
    });
  }

  function handleCancelar() {
    if (!eleccion) return;
    startTransition(async () => {
      const res = await cancelarEleccion(eleccion.id);
      if (res.ok) {
        mostrarToast(res.message ?? "Cancelada");
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error", "error");
      }
    });
  }

  return (
    <div className="mx-3 mt-3">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{
            background: toast.tipo === "error" ? "var(--red)" : "var(--gold)",
            color: toast.tipo === "error" ? "#fff" : "#12261c",
          }}
        >
          {toast.texto}
        </div>
      )}

      {eleccion ? (
        <>
          {/* Elección en curso */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(160deg, #1b4f39, #11352a)",
              border: "1px solid var(--gold)",
            }}
          >
            <div className="bebas text-xs tracking-widest" style={{ color: "var(--gold)" }}>
              🗳️ ELECCIÓN EN CURSO · RONDA {eleccion.round}
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--tx)" }}>
              {eleccion.motivo}
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[10px] uppercase" style={{ color: "var(--dim)" }}>
                  Votos
                </div>
                <div className="bebas text-3xl">
                  {votosCount} / {totalActivos}
                </div>
              </div>
            </div>

            <div
              className="mt-3 h-2 rounded-full"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <div
                className="h-full rounded-full transition"
                style={{
                  background: "var(--gold)",
                  width: `${totalActivos > 0 ? (votosCount / totalActivos) * 100 : 0}%`,
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleCerrar}
              disabled={isPending}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              {isPending ? "Cerrando..." : "🔒 Cerrar votación y anunciar"}
            </button>

            <button
              type="button"
              onClick={handleCancelar}
              disabled={isPending}
              className="mt-2 w-full rounded-xl border py-2 text-xs font-bold disabled:opacity-50"
              style={{ borderColor: "var(--red)", color: "var(--red)" }}
            >
              Cancelar elección
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Convocar elecciones */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(242,182,50,0.08)",
              border: "1px solid rgba(242,182,50,0.4)",
            }}
          >
            <div className="text-sm font-bold" style={{ color: "var(--gold)" }}>
              📢 Convocar elecciones
            </div>
            <p className="mt-2 text-xs" style={{ color: "var(--dim)" }}>
              Se abre la votación por 48 horas. Cada miembro activo elige un
              titular y un suplente.
            </p>

            {!confirmando ? (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="mt-4 w-full rounded-xl py-3 text-sm font-bold"
                style={{ background: "var(--or)", color: "#fff" }}
              >
                Llamar a elecciones
              </button>
            ) : (
              <div className="mt-4">
                <label className="mb-1 block text-[10px] uppercase" style={{ color: "var(--dim)" }}>
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Inicio de nueva temporada"
                  maxLength={100}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--tx)",
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    className="flex-1 rounded-xl border py-2 text-xs font-bold"
                    style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--dim)" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConvocar}
                    disabled={isPending}
                    className="flex-1 rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                    style={{ background: "var(--or)", color: "#fff" }}
                  >
                    {isPending ? "Creando..." : "Sí, convocar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}