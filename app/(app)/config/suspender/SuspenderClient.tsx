"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatearFechaAR, formatearHoraAR } from "@/lib/fecha";
import { suspenderFecha, reactivarFecha } from "./actions";

type Partido = {
  id: string;
  number: number;
  kickoff_at: string;
  place: string | null;
};

export default function SuspenderClient({
  partidosProgramados,
  partidosSuspendidos,
}: {
  partidosProgramados: Partido[];
  partidosSuspendidos: Partido[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    texto: string;
    tipo: "ok" | "error";
  } | null>(null);
  const [suspendiendo, setSuspendiendo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  function mostrarToast(texto: string, tipo: "ok" | "error" = "ok") {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSuspender(id: string) {
    startTransition(async () => {
      const res = await suspenderFecha(id, motivo);
      if (res.ok) {
        setSuspendiendo(null);
        setMotivo("");
        mostrarToast(res.message ?? "Fecha suspendida");
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error", "error");
      }
    });
  }

  function handleReactivar(id: string) {
    startTransition(async () => {
      const res = await reactivarFecha(id);
      if (res.ok) {
        mostrarToast(res.message ?? "Fecha reactivada");
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

      {/* Info general */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(242,182,50,0.08)",
          border: "1px solid rgba(242,182,50,0.3)",
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--gold)" }}>
              ¿Qué pasa cuando suspendés una fecha?
            </div>
            <ul className="mt-2 space-y-1 text-[11px]" style={{ color: "var(--tx)" }}>
              <li>• No suma puntos ni cuenta para el campeonato</li>
              <li>• Los equipos armados se anulan: cada DT vuelve a armar para la próxima fecha</li>
              <li>• Los valores de mercado se conservan (no vuelven a 0)</li>
              <li>• No corren los plazos de carga de resultados</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Programados */}
      <div className="bebas mt-5 px-1 text-lg tracking-wider">
        FECHAS PROGRAMADAS ({partidosProgramados.length})
      </div>
      {partidosProgramados.length === 0 ? (
        <div
          className="mt-2 rounded-2xl p-4 text-center text-xs"
          style={{ background: "var(--g1)", color: "var(--dim)" }}
        >
          No hay fechas programadas.
        </div>
      ) : (
        partidosProgramados.map((p) => {
          const info = formatearFechaAR(p.kickoff_at);
          return (
            <div
              key={p.id}
              className="mt-2 rounded-2xl p-4"
              style={{
                background: "var(--g1)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="bebas text-lg" style={{ color: "var(--gold)" }}>
                    Fecha {p.number}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--dim)" }}>
                    {info.dia}/{info.mes + 1} · {formatearHoraAR(p.kickoff_at)} hs
                    {p.place ? ` · ${p.place}` : ""}
                  </div>
                </div>

                {suspendiendo !== p.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuspendiendo(p.id);
                      setMotivo("");
                    }}
                    className="flex-none rounded-lg border px-3 py-1.5 text-[11px] font-bold transition"
                    style={{ borderColor: "var(--red)", color: "var(--red)" }}
                  >
                    ⏸️ Suspender
                  </button>
                )}
              </div>

              {suspendiendo === p.id && (
                <div className="mt-3">
                  <label
                    className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--dim)" }}
                  >
                    Motivo de la suspensión
                  </label>
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej: Lluvia, cancha mojada"
                    maxLength={80}
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
                      onClick={() => {
                        setSuspendiendo(null);
                        setMotivo("");
                      }}
                      disabled={isPending}
                      className="flex-1 rounded-xl border py-2 text-xs font-bold"
                      style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--dim)" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSuspender(p.id)}
                      disabled={isPending}
                      className="flex-1 rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                      style={{ background: "var(--red)", color: "#fff" }}
                    >
                      {isPending ? "Suspendiendo..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Suspendidos */}
      {partidosSuspendidos.length > 0 && (
        <>
          <div className="bebas mt-6 px-1 text-lg tracking-wider">
            FECHAS SUSPENDIDAS ({partidosSuspendidos.length})
          </div>
          {partidosSuspendidos.map((p) => {
            const info = formatearFechaAR(p.kickoff_at);
            return (
              <div
                key={p.id}
                className="mt-2 rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  opacity: 0.75,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bebas text-lg" style={{ color: "var(--dim)" }}>
                        Fecha {p.number}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: "rgba(255,255,255,0.1)", color: "var(--dim)" }}
                      >
                        SUSPENDIDA
                      </span>
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--dim)" }}>
                      {info.dia}/{info.mes + 1} · {formatearHoraAR(p.kickoff_at)} hs
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReactivar(p.id)}
                    disabled={isPending}
                    className="flex-none rounded-lg border px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50"
                    style={{ borderColor: "var(--gold)", color: "var(--gold)" }}
                  >
                    ▶️ Reactivar
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}