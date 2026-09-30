"use client";

import Avatar from "./Avatar";

type Props = {
  alias: string;
  photoUrl: string | null;
  puntos: number;
  posicion?: number | null;
  estrellas?: number;
  size?: "xs" | "sm" | "md" | "lg";
  onClick?: () => void;
};

const SIZES = {
  xs: { avatar: 52, name: 11, pts: 16, pos: 10, star: 10, pad: 6, w: 88 },
  sm: { avatar: 68, name: 13, pts: 20, pos: 11, star: 12, pad: 8, w: 106 },
  md: { avatar: 82, name: 14, pts: 24, pos: 12, star: 13, pad: 10, w: 122 },
  lg: { avatar: 108, name: 16, pts: 32, pos: 14, star: 15, pad: 14, w: 152 },
};

export default function Carta({
  alias,
  photoUrl,
  puntos,
  posicion,
  estrellas = 0,
  size = "md",
  onClick,
}: Props) {
  const s = SIZES[size];
  const mostrarPosicion = posicion !== null && posicion !== undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center rounded-2xl transition"
      style={{
        background: "#0a2818",
        padding: s.pad,
        width: s.w,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        cursor: onClick ? "pointer" : "default",
        border: "1.5px solid rgba(255,255,255,0.12)",
      }}
    >
      <Avatar
        alias={alias}
        photoUrl={photoUrl}
        size={s.avatar}
        ringColor="var(--gold)"
      />
      <div
        className="mt-1 truncate text-center font-bold"
        style={{ fontSize: s.name, color: "#fff", maxWidth: "100%", lineHeight: 1.1 }}
      >
        {alias}
      </div>
      <div
        className="bebas"
        style={{ fontSize: s.pts, color: "var(--gold)", lineHeight: 1 }}
      >
        {puntos}
      </div>
      {(mostrarPosicion || estrellas > 0) && (
        <div className="mt-0.5 flex items-center gap-1.5">
          {mostrarPosicion && (
            <span
              className="font-bold"
              style={{ fontSize: s.pos, color: "#c8d8ce" }}
            >
              #{posicion}
            </span>
          )}
          {estrellas > 0 && (
            <span
              className="flex items-center gap-0.5 font-bold"
              style={{ fontSize: s.star, color: "var(--gold)" }}
            >
              ⭐ {estrellas}
            </span>
          )}
        </div>
      )}
    </button>
  );
}