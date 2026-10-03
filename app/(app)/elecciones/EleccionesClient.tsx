"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { votar } from "@/app/(app)/config/elecciones/actions";

type Candidato = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  es_admin_actual: boolean;
};

type Eleccion = {
  id: string;
  round: number;
  motivo: string | null;
  closes_at: string;
  status: string;
};

type HistorialItem = {
  id: string;
  round: number;
  closed_at: string | null;
  titular: string;
  suplente: string;
};

export default function EleccionesClient({
  eleccion,
  candidatos,
  yaVote,
  historial,
}: {
  eleccion: Eleccion | null;
  candidatos: Candidato[];
  yaVote: boolean;
  historial: HistorialItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [candTitular, setCandTitular] = useState<string | null>(null);
  const [candSuplente, setCandSuplente] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleVotar() {
    if (!eleccion) return;
    if (!candTitular) return mostrarToast("Elegí un titular");
    if (!candSuplente) return mostrarToast("Elegí un suplente");
    if (candTitular === candSuplente) {
      return mostrarToast("No puede ser la misma persona");
    }

    startTransition(async () => {
      const res = await votar(eleccion.id, candTitular, candSuplente);
      if (res.ok) {
        mostrarToast("¡Voto registrado!");
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error");
      }
    });
  }

  // Sin elección abierta
  if (!eleccion) {
    return (
      <div className="mx-3 mt-3">
        {toast && (
          <div
            className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
            style={{ background: "var(--gold)", color: "#12261c" }}
          >
            {toast}
          </div>
        )}

        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: "var(--g1)",
            border: "1px dashed rgba(255,255,255,0.15)",
          }}
        >
          <div className="text-4xl">🗳️</div>
          <p className="bebas mt-3 text-xl">Sin elecciones abiertas</p>
          <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
            Cuando el admin convoque elecciones, vas a ver acá los candidatos
            para votar.
          </p>
        </div>

        {historial.length > 0 && (
          <>
            <div className="bebas mt-6 px-1 text-lg tracking-wider">
              HISTORIAL DE ELECCIONES
            </div>
            {historial.map((h) => (
              <div
                key={h.id}
                className="mt-2 rounded-2xl p-4"
                style={{ background: "var(--g1)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "var(--gold)" }}>
                    Ronda {h.round}
                  </span>
                </div>
                <div className="mt-2 text-xs">
                  <div>👑 Titular: <b>{h.titular}</b></div>
                  <div>🤝 Suplente: <b>{h.suplente}</b></div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // Elección abierta
  const cerrar = new Date(eleccion.closes_at);
  const ahora = new Date();
  const horasRestantes = Math.max(
    0,
    Math.floor((cerrar.getTime() - ahora.getTime()) / (1000 * 60 * 60))
  );

  return (
    <div className="mx-3 mt-3">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      {/* Card de la elección */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "linear-gradient(160deg, #1b4f39, #11352a)",
          border: "1px solid var(--gold)",
        }}
      >
        <div className="bebas text-xs tracking-widest" style={{ color: "var(--gold)" }}>
          🗳️ ELECCIONES ABIERTAS · RONDA {eleccion.round}
        </div>
        {eleccion.motivo && (
          <p className="mt-2 text-xs" style={{ color: "var(--tx)" }}>
            {eleccion.motivo}
          </p>
        )}
        <p className="mt-2 text-xs" style={{ color: "var(--dim)" }}>
          Cierra en {horasRestantes} h
        </p>
      </div>

      {yaVote ? (
        <div
          className="mt-4 rounded-2xl p-6 text-center"
          style={{
            background: "rgba(242,182,50,0.1)",
            border: "1px solid rgba(242,182,50,0.4)",
          }}
        >
          <div className="text-4xl">✅</div>
          <p className="bebas mt-2 text-xl" style={{ color: "var(--gold)" }}>
            ¡Ya votaste!
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
            Los resultados se anuncian cuando cierre la votación.
          </p>
        </div>
      ) : (
        <>
          {/* Titular */}
          <div className="bebas mt-5 px-1 text-lg tracking-wider">
            👑 ADMIN TITULAR
          </div>
          <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
            El que carga los resultados y administra el grupo
          </p>
          <div className="mt-2">
            {candidatos.map((c) => {
              const sel = candTitular === c.member_id;
              return (
                <button
                  key={c.member_id}
                  type="button"
                  onClick={() => setCandTitular(sel ? null : c.member_id)}
                  className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition"
                  style={{
                    background: sel ? "rgba(242,182,50,0.15)" : "var(--g1)",
                    border: `1px solid ${sel ? "var(--gold)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <Avatar alias={c.alias} photoUrl={c.photo_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.alias}</div>
                    {c.es_admin_actual && (
                      <div className="text-[10px]" style={{ color: "var(--gold)" }}>
                        Admin actual
                      </div>
                    )}
                  </div>
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full border"
                    style={{
                      borderColor: sel ? "var(--gold)" : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {sel && (
                      <span
                        className="block h-2.5 w-2.5 rounded-full"
                        style={{ background: "var(--gold)" }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Suplente */}
          <div className="bebas mt-5 px-1 text-lg tracking-wider">
            🤝 ADMIN SUPLENTE
          </div>
          <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
            Reemplaza al titular si no puede
          </p>
          <div className="mt-2">
            {candidatos.map((c) => {
              const sel = candSuplente === c.member_id;
              const disabled = candTitular === c.member_id;
              return (
                <button
                  key={c.member_id}
                  type="button"
                  onClick={() => !disabled && setCandSuplente(sel ? null : c.member_id)}
                  disabled={disabled}
                  className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition disabled:opacity-40"
                  style={{
                    background: sel ? "rgba(242,182,50,0.15)" : "var(--g1)",
                    border: `1px solid ${sel ? "var(--gold)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <Avatar alias={c.alias} photoUrl={c.photo_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.alias}</div>
                  </div>
                  <span
                    className="flex h-5 w-5 flex-none items-center justify-center rounded-full border"
                    style={{
                      borderColor: sel ? "var(--gold)" : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {sel && (
                      <span
                        className="block h-2.5 w-2.5 rounded-full"
                        style={{ background: "var(--gold)" }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleVotar}
            disabled={isPending || !candTitular || !candSuplente}
            className="mt-5 w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-40"
            style={{ background: "var(--or)", color: "#fff" }}
          >
            {isPending ? "Registrando..." : "Confirmar voto"}
          </button>
        </>
      )}
    </div>
  );
}