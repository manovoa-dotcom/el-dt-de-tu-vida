"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Avatar from "@/components/Avatar";
import type {
  DTResultado,
  JugadorResultado,
  PartidoResumen,
} from "./page";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = [
  "ene","feb","mar","abr","may","jun",
  "jul","ago","sep","oct","nov","dic",
];

// Layout del Equipo Ideal: 1 portero arriba + líneas abajo.
// Coordenadas [x%, y%]
const POSICIONES: Record<number, [number, number][]> = {
  // 5: 1 + 4
  5: [
    [50, 15],
    [15, 60],
    [38, 60],
    [62, 60],
    [85, 60],
  ],
  // 6: 1 + 2 + 3
  6: [
    [50, 15],
    [30, 45],
    [70, 45],
    [20, 78],
    [50, 78],
    [80, 78],
  ],
  // 7: 1 + 3 + 3
  7: [
    [50, 15],
    [20, 48],
    [50, 48],
    [80, 48],
    [20, 80],
    [50, 80],
    [80, 80],
  ],
  // 8: 1 + 3 + 4
  8: [
    [50, 14],
    [20, 44],
    [50, 44],
    [80, 44],
    [13, 78],
    [38, 78],
    [62, 78],
    [87, 78],
  ],
  // 9: 1 + 4 + 4
  9: [
    [50, 14],
    [13, 42],
    [38, 42],
    [62, 42],
    [87, 42],
    [13, 78],
    [38, 78],
    [62, 78],
    [87, 78],
  ],
  // 10: 1 + 3 + 3 + 3
  10: [
    [50, 12],
    [20, 38],
    [50, 38],
    [80, 38],
    [20, 65],
    [50, 65],
    [80, 65],
    [20, 90],
    [50, 90],
    [80, 90],
  ],
  // 11: 1 + 4 + 3 + 3
  11: [
    [50, 12],
    [13, 36],
    [38, 36],
    [62, 36],
    [87, 36],
    [20, 63],
    [50, 63],
    [80, 63],
    [20, 90],
    [50, 90],
    [80, 90],
  ],
};

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
  dtDeLaFecha,
  equipoIdeal,
  jugadores,
  dts,
}: Props) {
  const router = useRouter();
  const [verSelector, setVerSelector] = useState(false);

  const fecha = new Date(partidoActual.kickoff_at);

  function cambiarFecha(number: number) {
    setVerSelector(false);
    router.push(`/resultados?fecha=${number}`);
  }

  const podio = dts.slice(0, 3);
  const idsEquipoIdeal = new Set(equipoIdeal.map((j) => j.member_id));

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
              {DIAS[fecha.getDay()]} {fecha.getDate()} de {MESES[fecha.getMonth()]}
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
              const d = new Date(p.kickoff_at);
              const activo = p.number === partidoActual.number;
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
                      {DIAS[d.getDay()]} {d.getDate()} {MESES[d.getMonth()]}
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
              <PodioDT dt={podio[0]} posicion={1} altura={100} />
            )}
            {podio.length === 2 && (
              <>
                <PodioDT dt={podio[1]} posicion={2} altura={80} />
                <PodioDT dt={podio[0]} posicion={1} altura={110} />
              </>
            )}
            {podio.length >= 3 && (
              <>
                <PodioDT dt={podio[1]} posicion={2} altura={80} />
                <PodioDT dt={podio[0]} posicion={1} altura={110} />
                <PodioDT dt={podio[2]} posicion={3} altura={70} />
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
          <div className="mx-auto mt-3" style={{ maxWidth: 340 }}>
            <CanchaIdeal jugadores={equipoIdeal} />
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
  altura,
}: {
  dt: DTResultado;
  posicion: 1 | 2 | 3;
  altura: number;
}) {
  const medalla = posicion === 1 ? "🥇" : posicion === 2 ? "🥈" : "🥉";
  const color = posicion === 1 ? "var(--gold)" : "rgba(255,255,255,0.4)";
  const esPrimero = posicion === 1;

  return (
    <div className="flex flex-col items-center" style={{ flex: 1 }}>
      <Avatar
        alias={dt.alias}
        photoUrl={dt.photo_url}
        size={esPrimero ? 56 : 44}
        ringColor={esPrimero ? "var(--gold)" : undefined}
      />
      <div
        className="mt-1 truncate text-center text-[11px] font-semibold"
        style={{ color: esPrimero ? "var(--gold)" : "var(--tx)", maxWidth: 90 }}
      >
        {dt.alias}
      </div>
      <div className="text-base">{medalla}</div>
      <div
        className="flex w-full flex-col items-center justify-start rounded-t-xl pt-2"
        style={{
          height: altura,
          background: esPrimero
            ? "linear-gradient(180deg, #1b4f39, #11352a)"
            : "var(--g1)",
          border: esPrimero ? "1px solid var(--gold)" : "none",
        }}
      >
        <div className="bebas text-2xl" style={{ color }}>
          {dt.points}
        </div>
        <div className="text-[9px]" style={{ color: "var(--dim)" }}>
          pts
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Cancha con el Equipo Ideal
// ────────────────────────────────────────────────────────────────
function CanchaIdeal({ jugadores }: { jugadores: JugadorResultado[] }) {
  const n = jugadores.length;
  const posiciones = POSICIONES[n] ?? generarPosiciones(n);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        aspectRatio: "1 / 1",
        background:
          "repeating-linear-gradient(180deg, #1f6b3a 0 10%, #247a43 10% 20%)",
        border: "2px solid rgba(255,255,255,0.4)",
      }}
    >
      {/* Círculo central */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "30%",
          aspectRatio: "1",
          border: "2.5px solid rgba(255,255,255,0.4)",
        }}
      />
      {/* Línea del medio */}
      <div
        className="absolute left-0 right-0 top-1/2"
        style={{ height: 2.5, background: "rgba(255,255,255,0.4)" }}
      />
      {/* Área de arriba */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 0,
          width: "55%",
          height: "13%",
          borderBottom: "2.5px solid rgba(255,255,255,0.4)",
          borderLeft: "2.5px solid rgba(255,255,255,0.4)",
          borderRight: "2.5px solid rgba(255,255,255,0.4)",
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
        }}
      />
      {/* Área de abajo */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 0,
          width: "55%",
          height: "13%",
          borderTop: "2.5px solid rgba(255,255,255,0.4)",
          borderLeft: "2.5px solid rgba(255,255,255,0.4)",
          borderRight: "2.5px solid rgba(255,255,255,0.4)",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
        }}
      />

      {/* Jugadores */}
      {jugadores.map((j, idx) => {
        const [x, y] = posiciones[idx] ?? [50, 50];
        return (
          <div
            key={j.member_id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              maxWidth: 90,
            }}
          >
            <Avatar
              alias={j.alias}
              photoUrl={j.photo_url}
              size={40}
              ringColor="var(--gold)"
            />
            <div
              className="mt-0.5 truncate text-center text-[10px] font-bold"
              style={{
                color: "#fff",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                maxWidth: 80,
              }}
            >
              {j.alias}
            </div>
            <div
              className="bebas text-sm leading-none"
              style={{
                color: "var(--gold)",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              }}
            >
              {j.points}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function generarPosiciones(n: number): [number, number][] {
  // Fallback para cantidades no previstas
  const res: [number, number][] = [];
  res.push([50, 15]); // portero
  const resto = n - 1;
  const filas = Math.min(3, Math.ceil(resto / 4));
  const perFila = Math.ceil(resto / filas);
  for (let i = 0; i < resto; i++) {
    const fila = Math.floor(i / perFila);
    const idx = i % perFila;
    const cantFila = Math.min(perFila, resto - fila * perFila);
    const y = 42 + fila * 25;
    const x = (100 / (cantFila + 1)) * (idx + 1);
    res.push([x, y]);
  }
  return res;
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
          color: j.points === 0 ? "var(--dim)" : enIdeal ? "var(--gold)" : "var(--tx)",
        }}
      >
        {j.points}
      </span>
    </div>
  );
}