"use client";

import Carta from "./Carta";

export type JugadorCancha = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  points: number;
  posicion?: number | null;
  estrellas?: number;
};

const POSICIONES: Record<number, [number, number][]> = {
  5: [
    [50, 22],
    [15, 55],
    [38, 55],
    [62, 55],
    [85, 55],
  ],
  6: [
    [50, 18],
    [30, 48],
    [70, 48],
    [20, 82],
    [50, 82],
    [80, 82],
  ],
  7: [
    [50, 18],
    [20, 48],
    [50, 48],
    [80, 48],
    [20, 82],
    [50, 82],
    [80, 82],
  ],
  8: [
    [50, 15],
    [20, 45],
    [50, 45],
    [80, 45],
    [13, 80],
    [38, 80],
    [62, 80],
    [87, 80],
  ],
  9: [
    [50, 15],
    [13, 45],
    [38, 45],
    [62, 45],
    [87, 45],
    [13, 80],
    [38, 80],
    [62, 80],
    [87, 80],
  ],
  10: [
    [50, 14],
    [20, 40],
    [50, 40],
    [80, 40],
    [20, 68],
    [50, 68],
    [80, 68],
    [20, 94],
    [50, 94],
    [80, 94],
  ],
  11: [
    [50, 14],
    [13, 38],
    [38, 38],
    [62, 38],
    [87, 38],
    [20, 66],
    [50, 66],
    [80, 66],
    [20, 94],
    [50, 94],
    [80, 94],
  ],
};

type Props = {
  titulares: JugadorCancha[];
  suplente?: JugadorCancha | null;
  maxWidth?: number;
};

export default function CanchaEquipo({
  titulares,
  suplente,
  maxWidth = 460,
}: Props) {
  const n = titulares.length;
  const posiciones = POSICIONES[n] ?? generarPosiciones(n);

  return (
    <div style={{ maxWidth, margin: "0 auto" }}>
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
        {/* Línea media */}
        <div
          className="absolute left-0 right-0 top-1/2"
          style={{ height: 2.5, background: "rgba(255,255,255,0.4)" }}
        />
        {/* Área arriba */}
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
        {/* Área abajo */}
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
        {titulares.map((j, idx) => {
          const [x, y] = posiciones[idx] ?? [50, 50];
          return (
            <div
              key={j.member_id}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <Carta
                alias={j.alias}
                photoUrl={j.photo_url}
                puntos={j.points}
                posicion={j.posicion}
                estrellas={j.estrellas ?? 0}
                size="xs"
              />
            </div>
          );
        })}
      </div>

      {suplente && (
        <div
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2"
          style={{
            background: "#0a2818",
            border: "1.5px solid rgba(242,182,50,0.3)",
          }}
        >
          <div
            className="bebas text-[10px] tracking-wider"
            style={{ color: "var(--gold)" }}
          >
            SUPLENTE
          </div>
          <Carta
            alias={suplente.alias}
            photoUrl={suplente.photo_url}
            puntos={suplente.points}
            posicion={suplente.posicion}
            estrellas={suplente.estrellas ?? 0}
            size="xs"
          />
        </div>
      )}
    </div>
  );
}

function generarPosiciones(n: number): [number, number][] {
  const res: [number, number][] = [];
  res.push([50, 20]);
  const resto = n - 1;
  const filas = Math.min(3, Math.ceil(resto / 4));
  const perFila = Math.ceil(resto / filas);
  for (let i = 0; i < resto; i++) {
    const fila = Math.floor(i / perFila);
    const idx = i % perFila;
    const cantFila = Math.min(perFila, resto - fila * perFila);
    const y = 48 + fila * 24;
    const x = (100 / (cantFila + 1)) * (idx + 1);
    res.push([x, y]);
  }
  return res;
}