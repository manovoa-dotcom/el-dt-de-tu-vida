"use client";

import Avatar from "./Avatar";

export type JugadorCancha = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  points: number;
};

const POSICIONES: Record<number, [number, number][]> = {
  5: [
    [50, 15],
    [15, 60],
    [38, 60],
    [62, 60],
    [85, 60],
  ],
  6: [
    [50, 15],
    [30, 45],
    [70, 45],
    [20, 78],
    [50, 78],
    [80, 78],
  ],
  7: [
    [50, 15],
    [20, 48],
    [50, 48],
    [80, 48],
    [20, 80],
    [50, 80],
    [80, 80],
  ],
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
  titulares: JugadorCancha[];
  suplente?: JugadorCancha | null;
  maxWidth?: number;
};

export default function CanchaEquipo({
  titulares,
  suplente,
  maxWidth = 340,
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
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "30%",
            aspectRatio: "1",
            border: "2.5px solid rgba(255,255,255,0.4)",
          }}
        />
        <div
          className="absolute left-0 right-0 top-1/2"
          style={{ height: 2.5, background: "rgba(255,255,255,0.4)" }}
        />
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

        {titulares.map((j, idx) => {
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

      {suplente && (
        <div
          className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2"
          style={{
            background: "var(--g1)",
            border: "1px solid rgba(242,182,50,0.3)",
          }}
        >
          <div
            className="bebas text-[10px] tracking-wider"
            style={{ color: "var(--gold)" }}
          >
            SUPLENTE
          </div>
          <Avatar
            alias={suplente.alias}
            photoUrl={suplente.photo_url}
            size={32}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {suplente.alias}
            </div>
          </div>
          <div className="bebas text-lg" style={{ color: "var(--dim)" }}>
            {suplente.points}
          </div>
        </div>
      )}
    </div>
  );
}

function generarPosiciones(n: number): [number, number][] {
  const res: [number, number][] = [];
  res.push([50, 15]);
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