"use client";

import { useEffect, useState } from "react";

type Posicion = "arriba" | "abajo" | "izquierda" | "derecha" | "centro";

type Props = {
  pasoActual: number;
  totalPasos: number;
  titulo: string;
  texto: string;
  targetId: string | null;
  posicion: Posicion;
  botonSiguiente?: string;
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
  onNext,
  onPrev,
  onSkip,
  linkSecundario,
}: Props) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [posicionado, setPosicionado] = useState(false);

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

    // Intento inmediato + reintentos
    actualizar();
    const t1 = setTimeout(actualizar, 50);
    const t2 = setTimeout(actualizar, 150);
    const t3 = setTimeout(actualizar, 400);

    // Fallback: solo si después de 1.2s NO se encontró el target
    const fallback = setTimeout(() => {
      if (cancelado || encontrado) return;
      setTargetRect(null);
      setPosicionado(true);
    }, 1200);

    // Reposicionar si el usuario hace scroll o cambia el tamaño
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

  // Calcular posición del globo
  let globoStyle: React.CSSProperties = {};
  let tailDir: Posicion = "abajo";
  const MARGEN = 16;

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
      // Globo arriba del target → la cola apunta hacia abajo
      globoStyle = {
        left: Math.max(MARGEN, Math.min(left, window.innerWidth - 340)),
        bottom: window.innerHeight - top + MARGEN,
        width: Math.min(340, window.innerWidth - MARGEN * 2),
      };
      tailDir = "abajo";
    } else if (posicion === "abajo") {
      // Globo debajo del target → la cola apunta hacia arriba
      globoStyle = {
        left: Math.max(MARGEN, Math.min(left, window.innerWidth - 340)),
        top: bottom + MARGEN,
        width: Math.min(340, window.innerWidth - MARGEN * 2),
      };
      tailDir = "arriba";
    } else if (posicion === "izquierda") {
      // Globo a la izquierda del target → la cola apunta hacia la derecha
      globoStyle = {
        right: window.innerWidth - left + MARGEN,
        top: Math.max(MARGEN, top - 40),
        width: Math.min(340, window.innerWidth - MARGEN * 2),
      };
      tailDir = "derecha";
    } else {
      // derecha
      globoStyle = {
        left: right + MARGEN,
        top: Math.max(MARGEN, top - 40),
        width: Math.min(340, window.innerWidth - MARGEN * 2),
      };
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
        {/* Cola */}
        {tailDir !== "centro" && (
          <div
            className="absolute"
            style={{
              ...(tailDir === "abajo" && {
                left: targetRect
                  ? Math.max(
                      20,
                      Math.min(
                        targetRect.left + targetRect.width / 2 - (globoStyle.left as number),
                        (globoStyle.width as number) - 40
                      )
                    )
                  : "50%",
                bottom: -22,
                width: 0,
                height: 0,
                borderLeft: "12px solid transparent",
                borderRight: "12px solid transparent",
                borderTop: "24px solid #000",
              }),
              ...(tailDir === "arriba" && {
                left: targetRect
                  ? Math.max(
                      20,
                      Math.min(
                        targetRect.left + targetRect.width / 2 - (globoStyle.left as number),
                        (globoStyle.width as number) - 40
                      )
                    )
                  : "50%",
                top: -22,
                width: 0,
                height: 0,
                borderLeft: "12px solid transparent",
                borderRight: "12px solid transparent",
                borderBottom: "24px solid #000",
              }),
              ...(tailDir === "derecha" && {
                right: -22,
                top: 30,
                width: 0,
                height: 0,
                borderTop: "12px solid transparent",
                borderBottom: "12px solid transparent",
                borderLeft: "24px solid #000",
              }),
              ...(tailDir === "izquierda" && {
                left: -22,
                top: 30,
                width: 0,
                height: 0,
                borderTop: "12px solid transparent",
                borderBottom: "12px solid transparent",
                borderRight: "24px solid #000",
              }),
            }}
          />
        )}

        {/* Cuerpo del globo con efecto cómic */}
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

          {/* Saltar */}
                   {/* Link secundario (opcional) */}
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

          {/* Saltar tutorial completo */}
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