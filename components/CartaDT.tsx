"use client";

import type { CSSProperties } from "react";
import Avatar from "./Avatar";

export type JugadorCartaDT = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  points: number;
};

export type ItemCartaDT = {
  label: string;
  points: number;
};

type Props = {
  nombre: string;
  alias: string;
  photoUrl: string | null;
  puntos: number;
  posicion: 1 | 2 | 3;
  fecha: number;
  fechaTexto: string;
  titulares: JugadorCartaDT[];
  suplente: JugadorCartaDT | null;
  items?: ItemCartaDT[];
  medallaEquipoIdeal?: boolean;
  sinMedalla?: boolean;
  illustrationUrl?: string | null;
  illustrationVariant?: "player" | "charly-dt";
  onClick?: () => void;
};

const MEDALLAS = {
  1: { label: "ORO", clase: "oro", archivo: "medalla-oro.png" },
  2: { label: "PLATA", clase: "plata", archivo: "medalla-plata.png" },
  3: { label: "BRONCE", clase: "bronce", archivo: "medalla-bronce.png" },
};

export default function CartaDT({
  nombre,
  alias,
  photoUrl,
  puntos,
  posicion,
  fecha,
  fechaTexto,
  titulares,
  suplente,
  items,
  medallaEquipoIdeal = false,
  sinMedalla = false,
  illustrationUrl,
  illustrationVariant,
  onClick,
}: Props) {
  const medalla = medallaEquipoIdeal
    ? {
        label: "EQUIPO IDEAL",
        clase: "ideal",
        archivo: "medalla-equipo-ideal.png",
      }
    : MEDALLAS[posicion];
  const equipo = [
    ...titulares.map((jugador) => ({
      ...jugador,
      rol: "T",
      puntosMostrados: jugador.points,
    })),
    ...(suplente
      ? [
          {
            ...suplente,
            rol: "S",
            puntosMostrados: suplente.points / 2,
          },
        ]
      : []),
  ]
    .sort((a, b) => b.puntosMostrados - a.puntosMostrados)
    .slice(0, 6);
  const ariaLabel = medallaEquipoIdeal
    ? `Carta de ${alias}, ${puntos} puntos, Equipo Ideal.`
    : sinMedalla
      ? `Carta de ${nombre || alias}, ${puntos} puntos, con detalle de ítems.`
      : `Ver equipo de ${alias}, ${puntos} puntos, ${medalla.label}. El suplente suma la mitad de sus puntos.`;
  const illustrationVariantClass =
    illustrationVariant === "player"
      ? " carta-dt-avatar-ilustracion-jugador"
      : illustrationVariant === "charly-dt"
        ? " carta-dt-avatar-ilustracion-charly-dt"
        : "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="carta-dt"
      aria-label={ariaLabel}
      style={
        {
          "--carta-medalla": medalla.label,
          "--medalla-clase": medalla.clase,
        } as CSSProperties
      }
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/cards/carta-fondo.png')",
          backgroundPosition: "center",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="carta-dt-logo"
        src="/cards/logo.png"
        alt="El DT de tu vida"
      />

      <div
        className={
          illustrationUrl
            ? `carta-dt-avatar carta-dt-avatar-ilustracion${illustrationVariantClass}`
            : "carta-dt-avatar carta-dt-avatar-fallback"
        }
      >
        {illustrationUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={illustrationUrl} alt={nombre || alias} />
        ) : (
          <div className="carta-dt-avatar-circulo">
            {photoUrl ? (
              <Avatar
                alias={nombre || alias}
                photoUrl={photoUrl}
                size={68}
                ringColor="rgba(255,255,255,0.85)"
              />
            ) : (
              <div className="carta-dt-avatar-escudo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cards/escudo-juego.png" alt="Escudo del juego" />
              </div>
            )}
          </div>
        )}
      </div>

      {!sinMedalla && (
        <div className="absolute right-[11%] top-[14%] z-10 text-center">
          <div
            className={`carta-dt-medalla carta-dt-medalla-${medalla.clase}`}
            aria-label={`Medalla de ${medalla.label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/cards/${medalla.archivo}`}
              alt={`Medalla de ${medalla.label}`}
            />
          </div>
        </div>
      )}

      <div className="absolute left-[42%] right-[11%] top-[37%] z-10 text-right">
        <div className="carta-dt-nombre">{nombre || "DT"}</div>
        <div className="carta-dt-alias">{alias}</div>
      </div>

      <div
        className="absolute left-[11%] right-[11%] z-10"
        style={{ top: items !== undefined ? "55%" : "50%" }}
      >
        <div className="carta-dt-jugadores">
          {items
            ? items.map((item, index) => (
                <div
                  className="carta-dt-jugador carta-dt-item"
                  key={`${item.label}-${index}`}
                >
                  <span className="truncate">{item.label}</span>
                  <b>{formatPoints(item.points)}</b>
                </div>
              ))
            : equipo.map((jugador, index) => (
                <div
                  className="carta-dt-jugador"
                  key={`${jugador.rol}-${jugador.member_id}`}
                >
                  <span className="carta-dt-posicion">{index + 1}</span>
                  <span className="carta-dt-rol">
                    {jugador.rol === "S" ? "S½" : "T"}
                  </span>
                  <span className="truncate">{jugador.alias}</span>
                  <b>{formatPoints(jugador.puntosMostrados)}</b>
                </div>
              ))}
        </div>
      </div>

      <div className="carta-dt-footer absolute bottom-[6.5%] left-[11%] right-[11%] z-10 flex items-end justify-between">
        <div className="text-left">
          <div className="carta-dt-fecha">FECHA {fecha}</div>
          <div className="carta-dt-dia">{fechaTexto}</div>
        </div>
        <div className="flex items-baseline gap-[5%]">
          <span className="carta-dt-puntos-label">pts</span>
          <span className="carta-dt-puntos">{puntos}</span>
        </div>
      </div>
    </button>
  );
}

function formatPoints(points: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  }).format(points);
}
