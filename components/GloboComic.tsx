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

  // Medir la altura real del globo
  useEffect(() => {
    if (!posicionado) return;
    const medir = () => {
      if (globoRef.current) {
        const h = globoRef.current.getBoundingClientRect().height;
        if (h > 0 && Math.abs(h - altoGlobo) > 4) {
          setAltoGlobo(h);
        }
      }
    };
    medir();
    const t = setTimeout(medir, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posicionado, pasoActual, titulo, texto]);

  if (!posicionado) return null;

  // ─── Algoritmo de posición simple y robusto ───
  const VW = window.innerWidth;
  const VH = window.innerHeight;
  const MARGEN = 12;
  const ANCHO_GLOBO = Math.min(340, VW - MARGEN * 2);
    const ALTO = altoGlobo;

  // Decidir modo: arriba del target, abajo del target, o centrado
  let modo: "arriba" | "abajo" | "centro" = "centro";
  let targetCentroY = VH / 2;
  let targetCentroX = VW / 2;

  if (targetRect) {
    targetCentroY = targetRect.top + targetRect.height / 2;
    targetCentroX = targetRect.left + targetRect.width / 2;

    if (posicion === "arriba") {
      // Pedido: arriba. Si hay espacio, arriba. Si no, abajo.
      const espacioArriba = targetRect.top - MARGEN - 16;
      if (espacioArriba >= ALTO) {
        modo = "arriba";
      } else if (VH - targetRect.bottom - MARGEN - 16 >= ALTO) {
        modo = "abajo";
      } else {
        modo = "centro";
      }
    } else if (posicion === "abajo") {
      const espacioAbajo = VH - targetRect.bottom - MARGEN - 16;
      if (espacioAbajo >= ALTO) {
        modo = "abajo";
      } else if (targetRect.top - MARGEN - 16 >= ALTO) {
        modo = "arriba";
      } else {
        modo = "centro";
      }
    } else {
      modo = "centro";
    }
  } else {
    modo = "centro";
  }

  // Calcular leftPx
  let leftPx: number;
  if (centradoX || !targetRect || modo === "centro") {
    leftPx = (VW - ANCHO_GLOBO) / 2;
  } else {
    // Tratar de alinear con el centro del target
    leftPx = targetCentroX - ANCHO_GLOBO / 2;
    // Clamp: no salirse
    leftPx = Math.max(MARGEN, Math.min(leftPx, VW - ANCHO_GLOBO - MARGEN));
  }

  // Calcular topPx
  let topPx: number;
  if (modo === "arriba" && targetRect) {
    topPx = targetRect.top - ALTO - 16;
    topPx = Math.max(MARGEN, topPx);
  } else if (modo === "abajo" && targetRect) {
    topPx = targetRect.bottom + 16;
    topPx = Math.min(topPx, VH - ALTO - MARGEN);
    topPx = Math.max(MARGEN, topPx);
  } else {
    // centrado vertical
    topPx = Math.max(MARGEN, (VH - ALTO) / 2);
  }

  // Colita
  let tailDir: Posicion = "centro";
  let tailLeftPx = 0;

  if (modo === "arriba" && targetRect) {
    tailDir = "abajo";
    const centro = targetCentroX - leftPx;
    tailLeftPx = Math.max(24, Math.min(centro - 12, ANCHO_GLOBO - 48));
  } else if (modo === "abajo" && targetRect) {
    tailDir = "arriba";
    const centro = targetCentroX - leftPx;
    tailLeftPx = Math.max(24, Math.min(centro - 12, ANCHO_GLOBO - 48));
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
        style={{
          left: leftPx,
          top: topPx,
          width: ANCHO_GLOBO,
        }}
      >
        {/* Colita blanca con borde negro */}
        {tailDir !== "centro" && (
          <div
            className="absolute"
            style={{
              width: 24,
              height: 24,
              background: "#fff",
              transform: "rotate(45deg)",
              ...(tailDir === "abajo" && {
                left: tailLeftPx,
                bottom: -14,
                borderRight: "3px solid #000",
                borderBottom: "3px solid #000",
              }),
              ...(tailDir === "arriba" && {
                left: tailLeftPx,
                top: -14,
                borderLeft: "3px solid #000",
                borderTop: "3px solid #000",
              }),
            }}
          />
        )}

        {/* Cuerpo del globo */}
               <div
          ref={globoRef}
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
              fontSize: 22,
              lineHeight: 1.1,
              color: "#12261c",
              marginBottom: 5,
            }}
          >
            {titulo}
          </div>

          {/* Texto */}
                    <div
            style={{
              fontSize: 13,
              lineHeight: 1.35,
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