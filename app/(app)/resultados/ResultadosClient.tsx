"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import Carta from "@/components/Carta";
import CanchaEquipo from "@/components/CanchaEquipo";
import {
  formatearFechaAR,
  formatearHoraAR,
  DIAS_SEMANA,
  MESES_CORTOS,
} from "@/lib/fecha";
import type {
  DTResultado,
  JugadorResultado,
  PartidoResumen,
} from "./page";

type Props = {
  partidos: PartidoResumen[];
  partidoActual: PartidoResumen;
  dtDeLaFecha: DTResultado | null;
  equipoIdeal: JugadorResultado[];
  jugadores: JugadorResultado[];
  dts: DTResultado[];
};

export default function ResultadosClient({
  partidos,
  partidoActual,
  equipoIdeal,
  jugadores,
  dts,
}: Props) {
  const router = useRouter();
  const [verSelector, setVerSelector] = useState(false);

  function cambiarFecha(number: number) {
    setVerSelector(false);
    router.push(`/resultados?fecha=${number}`);
  }

  const podio = dts.slice(0, 3);
  const idsEquipoIdeal = new Set(equipoIdeal.map((j) => j.member_id));

  const fechaInfo = formatearFechaAR(partidoActual.kickoff_at);
  const hora = formatearHoraAR(partidoActual.kickoff_at);

  return (
    <div>
      {/* Selector de fecha */}
      <div className="relative mx-3 mt-3">
        <button
          type="button"
          onClick={() => setVerSelector((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: "var(--g1)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-left">
            <div className="bebas text-base" style={{ color: "var(--gold)" }}>
              FECHA {partidoActual.number}
            </div>
            <div className="text-[11px]" style={{ color: "var(--dim)" }}>
              {DIAS_SEMANA[fechaInfo.diaSemana]} {fechaInfo.dia} de{" "}
              {MESES_CORTOS[fechaInfo.mes]} · {hora}
              {partidoActual.place ? ` · ${partidoActual.place}` : ""}
            </div>
          </div>
          <span
            className="text-xs transition"
            style={{
              color: "var(--dim)",
              transform: verSelector ? "rotate(180deg)" : "rotate(0)",
            }}
          >
            ▼
          </span>
        </button>

        {verSelector && (
          <div
            className="absolute left-0 right-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-xl shadow-2xl"
            style={{
              background: "var(--g1)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {partidos.map((p) => {
              const activo = p.number === partidoActual.number;
              const info = formatearFechaAR(p.kickoff_at);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => cambiarFecha(p.number)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left"
                  style={{
                    background: activo ? "rgba(242,182,50,0.1)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: activo ? "var(--gold)" : "var(--tx)" }}
                    >
                      Fecha {p.number}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--dim)" }}>
                      {DIAS_SEMANA[info.diaSemana]} {info.dia}{" "}
                      {MESES_CORTOS[info.mes]}
                    </div>
                  </div>
                  {activo && (
                    <span className="text-xs" style={{ color: "var(--gold)" }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Podio DT de la fecha */}
      {podio.length > 0 && (
        <>
          <div className="bebas mt-6 px-4 text-xl tracking-wider">
            🏆 DT DE LA FECHA
          </div>
          <div className="mt-3 flex items-end justify-center gap-2 px-3">
            {podio.length === 1 && (
              <PodioDT dt={podio[0]} posicion={1} />
            )}
            {podio.length === 2 && (
              <>
                <PodioDT dt={podio[1]} posicion={2} />
                <PodioDT dt={podio[0]} posicion={1} />
              </>
            )}
            {podio.length >= 3 && (
              <>
                <PodioDT dt={podio[1]} posicion={2} />
                <PodioDT dt={podio[0]} posicion={1} />
                <PodioDT dt={podio[2]} posicion={3} />
              </>
            )}
          </div>
        </>
      )}

      {/* Cancha con el Equipo Ideal */}
      {equipoIdeal.length > 0 && (
        <>
          <div className="bebas mt-6 px-4 text-xl tracking-wider">
            ⭐ EQUIPO IDEAL
          </div>
          <p className="px-4 text-[11px]" style={{ color: "var(--dim)" }}>
            Los {equipoIdeal.length} mejores de la fecha
          </p>
          <div className="mx-auto mt-3 px-3">
            <CanchaEquipo
              titulares={equipoIdeal.map((j) => ({
                member_id: j.member_id,
                alias: j.alias,
                photo_url: j.photo_url,
                points: j.points,
              }))}
            />
          </div>
        </>
      )}

      {/* Todos los jugadores */}
      <div className="bebas mt-6 px-4 text-xl tracking-wider">
        JUGADORES ({jugadores.length})
      </div>
      <div className="mt-1">
        {jugadores.map((j) => (
          <FilaJugador
            key={j.member_id}
            j={j}
            enIdeal={idsEquipoIdeal.has(j.member_id)}
          />
        ))}
        {jugadores.length === 0 && (
          <p className="px-4 py-3 text-xs" style={{ color: "var(--dim)" }}>
            Nadie sumó puntos esta fecha.
          </p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Podio DT
// ────────────────────────────────────────────────────────────────
function PodioDT({
  dt,
  posicion,
}: {
  dt: DTResultado;
  posicion: 1 | 2 | 3;
}) {
  const medalla = posicion === 1 ? "🥇" : posicion === 2 ? "🥈" : "🥉";
  return (
    <div className="flex flex-col items-center" style={{ flex: 1 }}>
      <div className="mb-1 text-2xl">{medalla}</div>
      <Carta
        alias={dt.alias}
        photoUrl={dt.photo_url}
        puntos={dt.points}
        posicion={posicion}
        size="sm"
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Fila de jugador
// ────────────────────────────────────────────────────────────────
function FilaJugador({
  j,
  enIdeal,
}: {
  j: JugadorResultado;
  enIdeal: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: enIdeal ? "rgba(242,182,50,0.08)" : undefined,
      }}
    >
      <Avatar alias={j.alias} photoUrl={j.photo_url} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{j.alias}</span>
          {enIdeal && <span className="text-[10px]">⭐</span>}
          {j.is_invitado && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              INV
            </span>
          )}
        </div>
        {j.items.length > 0 ? (
          <div className="truncate text-[11px]" style={{ color: "var(--dim)" }}>
            {j.items.map((i) => i.label).join(" · ")}
          </div>
        ) : (
          <div className="text-[11px]" style={{ color: "var(--dim)" }}>
            Sin puntos
          </div>
        )}
      </div>
      <span
        className="bebas text-xl"
        style={{
          color:
            j.points === 0
              ? "var(--dim)"
              : enIdeal
              ? "var(--gold)"
              : "var(--tx)",
        }}
      >
        {j.points}
      </span>
    </div>
  );
}
