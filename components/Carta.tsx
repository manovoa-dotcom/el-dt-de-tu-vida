"use client";

import Avatar from "./Avatar";

type Props = {
  alias: string;
  photoUrl: string | null;
  puntos: number;
  posicion: number | null;
  estrellas?: number;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
};

const SIZES = {
  sm: { avatar: 48, name: 12, pts: 16, pos: 11, star: 11, pad: 8, w: 90 },
  md: { avatar: 64, name: 14, pts: 20, pos: 12, star: 13, pad: 10, w: 110 },
  lg: { avatar: 90, name: 16, pts: 28, pos: 14, star: 15, pad: 14, w: 140 },
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center rounded-2xl transition"
      style={{
        background: "#fff",
        padding: s.pad,
        width: s.w,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        cursor: onClick ? "pointer" : "default",
        border: "none",
      }}
    >
      <Avatar alias={alias} photoUrl={photoUrl} size={s.avatar} ringColor="var(--gold)" />
      <div
        className="mt-1 truncate text-center font-bold"
        style={{ fontSize: s.name, color: "#12261c", maxWidth: "100%" }}
      >
        {alias}
      </div>
      <div
        className="bebas"
        style={{ fontSize: s.pts, color: "#12261c", lineHeight: 1 }}
      >
        {puntos}
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        {posicion !== null && (
          <span
            className="font-bold"
            style={{ fontSize: s.pos, color: "#5b6b60" }}
          >
            #{posicion}
          </span>
        )}
        {estrellas > 0 && (
          <span
            className="flex items-center gap-0.5 font-bold"
            style={{ fontSize: s.star, color: "#a67a1a" }}
          >
            ⭐ {estrellas}
          </span>
        )}
      </div>
    </button>
  );
}