"use client";

import { useEffect, useRef, useState } from "react";

type Posicion = "arriba" | "abajo" | "izquierda" | "derecha" | "centro";

type Props = {
  pasoActual: number;
  totalPasos: number;
  titulo: string;
  texto: string;
  targetId: string | null;
  posicion: Posicion;
  botonSiguiente?: string;
  centradoX?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  linkSecundario?: {
    label: string;
    onClick: () => void;
  };
};

export default function GloboComic({
  pasoActual,
  totalPasos,
  titulo,
  texto,
  targetId,
  posicion,
  botonSiguiente,
  centradoX = false,
  onNext,
  onPrev,
  onSkip,
  linkSecundario,
}: Props) {
   const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [posicionado, setPosicionado] = useState(false);
  const [altoGlobo, setAltoGlobo] = useState(280);
  const globoRef = useRef<HTMLDivElement>(null);

  // Detectar posición del target
  useEffect(() => {
    if (!targetId) {
      setTargetRect(null);
      setPosicionado(true);
      return;
    }

    let cancelado = false;
    let encontrado = false;

    const actualizar = () => {
      if (cancelado || encontrado) return;
      const el = document.getElementById(targetId);
      if (el) {
        encontrado = true;
        setTargetRect(el.getBoundingClientRect());
        setPosicionado(true);
      }
    };

    actualizar();
    const t1 = setTimeout(actualizar, 50);
    const t2 = setTimeout(actualizar, 150);
    const t3 = setTimeout(actualizar, 400);

    const fallback = setTimeout(() => {
      if (cancelado || encontrado) return;
      setTargetRect(null);
      setPosicionado(true);
    }, 1200);

    const onScroll = () => {
      if (cancelado || !encontrado) return;
      const el = document.getElementById(targetId);
      if (el) setTargetRect(el.getBoundingClientRect());
    };

    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      cancelado = true;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(fallback);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [targetId, pasoActual]);

  if (!posicionado) return null;

  // ─── Cálculos de posición ───
  const MARGEN = 12;
  const ANCHO_GLOBO = Math.min(340, window.innerWidth - MARGEN * 2);
  const ALTO_ESTIMADO = 280; // aproximado para evitar desborde

  let globoStyle: React.CSSProperties = {};
  let tailDir: Posicion = "abajo";
  let tailLeftPx: number | null = null;
  let tailTopPx: number | null = null;

  if (!targetRect || posicion === "centro") {
    globoStyle = {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: "min(90vw, 400px)",
    };
    tailDir = "centro";
  } else {
    const { top, left, width, height, bottom, right } = targetRect;

    if (posicion === "arriba") {
      // Globo arriba del target, colita apunta hacia abajo
      const leftPx = centradoX
        ? (window.innerWidth - ANCHO_GLOBO) / 2
        : Math.max(
            MARGEN,
            Math.min(
              left + width / 2 - ANCHO_GLOBO / 2,
              window.innerWidth - ANCHO_GLOBO - MARGEN
            )
          );

      globoStyle = {
        left: leftPx,
        bottom: Math.max(MARGEN, window.innerHeight - top + 14),
        width: ANCHO_GLOBO,
      };

      const centroTarget = left + width / 2;
      tailLeftPx = Math.max(
        24,
        Math.min(centroTarget - leftPx - 12, ANCHO_GLOBO - 48)
      );

      tailDir = "abajo";
    } else if (posicion === "abajo") {
      // Globo debajo del target, colita apunta hacia arriba
      const leftPx = centradoX
        ? (window.innerWidth - ANCHO_GLOBO) / 2
        : Math.max(
            MARGEN,
            Math.min(
              left + width / 2 - ANCHO_GLOBO / 2,
              window.innerWidth - ANCHO_GLOBO - MARGEN
            )
          );

      // Limitar la altura para que no se salga por abajo
      const topPx = Math.min(bottom + 14, window.innerHeight - ALTO_ESTIMADO - MARGEN);

      globoStyle = {
        left: leftPx,
        top: Math.max(MARGEN, topPx),
        width: ANCHO_GLOBO,
      };

      const centroTarget = left + width / 2;
      tailLeftPx = Math.max(
        24,
        Math.min(centroTarget - leftPx - 12, ANCHO_GLOBO - 48)
      );

      tailDir = "arriba";
    } else if (posicion === "izquierda") {
      // Globo a la izquierda del target, colita apunta a la derecha
      const rightPx = window.innerWidth - left + 14;
      const topPx = Math.max(
        MARGEN,
        Math.min(top + height / 2 - 60, window.innerHeight - ALTO_ESTIMADO - MARGEN)
      );

      globoStyle = {
        right: rightPx,
        top: topPx,
        width: ANCHO_GLOBO,
      };

      tailTopPx = 40;
      tailDir = "derecha";
    } else {
      // derecha
      const leftPx = Math.max(
        MARGEN,
        Math.min(right + 14, window.innerWidth - ANCHO_GLOBO - MARGEN)
      );
      const topPx = Math.max(
        MARGEN,
        Math.min(top + height / 2 - 60, window.innerHeight - ALTO_ESTIMADO - MARGEN)
      );

      globoStyle = {
        left: leftPx,
        top: topPx,
        width: ANCHO_GLOBO,
      };

      tailTopPx = 40;
      tailDir = "izquierda";
    }
  }

  return (
    <>
      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 z-[90]"
        style={{ background: "rgba(0,0,0,0.6)", pointerEvents: "auto" }}
        onClick={onSkip}
      />

      {/* Highlight del target */}
      {targetRect && targetId && (
        <div
          className="highlight-target pointer-events-none fixed z-[91] rounded-xl"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            border: "3px solid var(--gold)",
            background: "rgba(242,182,50,0.05)",
          }}
        />
      )}

      {/* El globo */}
      <div
        className="globo-aparecer fixed z-[92]"
        style={{ ...globoStyle }}
      >
        {/* Colita blanca con borde negro (solo en 2 lados) */}
        {tailDir !== "centro" && (
          <div
            className="absolute"
            style={{
              width: 24,
              height: 24,
              background: "#fff",
              transform: "rotate(45deg)",
              ...(tailDir === "abajo" && {
                left:
                  tailLeftPx !== null ? tailLeftPx : "50%",
                bottom: -14,
                borderRight: "3px solid #000",
                borderBottom: "3px solid #000",
              }),
              ...(tailDir === "arriba" && {
                left:
                  tailLeftPx !== null ? tailLeftPx : "50%",
                top: -14,
                borderLeft: "3px solid #000",
                borderTop: "3px solid #000",
              }),
              ...(tailDir === "derecha" && {
                right: -14,
                top: tailTopPx !== null ? tailTopPx : 40,
                borderTop: "3px solid #000",
                borderRight: "3px solid #000",
              }),
              ...(tailDir === "izquierda" && {
                left: -14,
                top: tailTopPx !== null ? tailTopPx : 40,
                borderBottom: "3px solid #000",
                borderLeft: "3px solid #000",
              }),
            }}
          />
        )}

        {/* Cuerpo del globo */}
        <div
          className="globo-flotar relative"
          style={{
            background: "#fff",
            border: "3px solid #000",
            borderRadius: 18,
            padding: "20px 22px 18px",
            boxShadow: "6px 6px 0 rgba(0,0,0,0.9)",
            ["--rot" as string]: "-1.5deg",
          }}
        >
          {/* Progreso */}
          <div className="mb-2 flex items-center gap-1.5">
            {Array.from({ length: totalPasos }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === pasoActual ? 16 : 6,
                  background: i === pasoActual ? "#12261c" : "#c8d3cc",
                }}
              />
            ))}
            <span
              className="ml-auto text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#5b6b60" }}
            >
              Paso {pasoActual + 1} de {totalPasos}
            </span>
          </div>

          {/* Título */}
          <div
            className="bangers"
            style={{
              fontSize: 26,
              lineHeight: 1.1,
              color: "#12261c",
              marginBottom: 6,
            }}
          >
            {titulo}
          </div>

          {/* Texto */}
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.4,
              color: "#1b2a22",
              whiteSpace: "pre-line",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {texto}
          </div>

          {/* Botones */}
          <div className="mt-4 flex items-center gap-2">
            {pasoActual > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition"
                style={{
                  borderColor: "#12261c",
                  background: "#fff",
                  color: "#12261c",
                }}
              >
                ← Atrás
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="ml-auto rounded-lg border-2 px-4 py-1.5 text-sm font-bold transition"
              style={{
                borderColor: "#12261c",
                background: "var(--or)",
                color: "#fff",
                boxShadow: "3px 3px 0 #12261c",
              }}
            >
              {botonSiguiente ?? "Siguiente →"}
            </button>
          </div>

          {/* Link secundario */}
          {linkSecundario && (
            <button
              type="button"
              onClick={linkSecundario.onClick}
              className="mt-3 block text-center text-[11px] underline"
              style={{ color: "#5b6b60", width: "100%" }}
            >
              {linkSecundario.label}
            </button>
          )}

          {/* Saltar tutorial */}
          <button
            type="button"
            onClick={onSkip}
            className="mt-1 block text-center text-[10px] underline"
            style={{ color: "#8a9a8f", width: "100%" }}
          >
            Saltar tutorial completo
          </button>
        </div>
      </div>
    </>
  );
}