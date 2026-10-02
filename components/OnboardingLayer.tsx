"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import GloboComic from "./GloboComic";
import {
  PASOS_ONBOARDING,
  ONBOARDING_STORAGE_KEY,
  type PasoOnboarding,
} from "@/lib/onboarding";

type Props = {
  hayPartidoJugado: boolean;
};

export default function OnboardingLayer({ hayPartidoJugado }: Props) {
  const pathname = usePathname();
  const [activo, setActivo] = useState(false);
  const [pasoIdx, setPasoIdx] = useState(0);

  // Verificar si hay que arrancar automáticamente
  useEffect(() => {
    if (typeof window === "undefined") return;
    const visto = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!visto) {
      // Arranca después de un pequeño delay para que la página cargue
      const timer = setTimeout(() => setActivo(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Escuchar el evento para reabrir desde el botón de ayuda
  useEffect(() => {
    const handler = () => {
      setPasoIdx(0);
      setActivo(true);
    };
    window.addEventListener("onboarding:start", handler);
    return () => window.removeEventListener("onboarding:start", handler);
  }, []);

  const terminar = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
    }
    setActivo(false);
  }, []);

  // Filtrar los pasos según disponibilidad
  const pasosDisponibles = PASOS_ONBOARDING.filter((p) => {
    if (p.requierePartidoJugado && !hayPartidoJugado) return false;
    return true;
  });

  if (!activo) return null;

  const paso = pasosDisponibles[pasoIdx];
  if (!paso) {
    terminar();
    return null;
  }

  // Determinar si el paso es de la pantalla actual
  const esDeEstaPantalla = pathname.startsWith(`/${paso.page}`);

  // Si no es de esta pantalla, mostramos un globo intermedio que invita a navegar
  if (!esDeEstaPantalla) {
    return (
      <GloboNavegacion
        paso={paso}
        pasoActual={pasoIdx}
        totalPasos={pasosDisponibles.length}
        onNext={() => setPasoIdx(pasoIdx + 1)}
        onPrev={() => setPasoIdx(Math.max(0, pasoIdx - 1))}
        onSkip={terminar}
      />
    );
  }

  return (
    <GloboComic
      pasoActual={pasoIdx}
      totalPasos={pasosDisponibles.length}
      titulo={paso.titulo}
      texto={paso.texto}
      targetId={paso.target}
      posicion={paso.posicion}
      botonSiguiente={paso.botonSiguiente}
      onNext={() => {
        if (pasoIdx === pasosDisponibles.length - 1) terminar();
        else setPasoIdx(pasoIdx + 1);
      }}
      onPrev={() => setPasoIdx(Math.max(0, pasoIdx - 1))}
      onSkip={terminar}
    />
  );
}

// ────────────────────────────────────────────────────────────────
// Globo intermedio (cuando el paso es de otra pantalla)
// ────────────────────────────────────────────────────────────────

function GloboNavegacion({
  paso,
  pasoActual,
  totalPasos,
  onNext,
  onPrev,
  onSkip,
}: {
  paso: PasoOnboarding;
  pasoActual: number;
  totalPasos: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const nombrePagina: Record<string, string> = {
    inicio: "Inicio",
    convocatoria: "Convocatoria",
    resultados: "Resultados",
  };

  return (
    <GloboComic
      pasoActual={pasoActual}
      totalPasos={totalPasos}
      titulo={`Vamos a ${nombrePagina[paso.page] ?? paso.page}`}
      texto={`Para el siguiente paso, andá a la pestaña "${nombrePagina[paso.page] ?? paso.page}" y el tutorial continúa automáticamente.`}
      targetId="onboarding-tabbar"
      posicion="arriba"
      botonSiguiente="Saltar este paso →"
      onNext={onNext}
      onPrev={onPrev}
      onSkip={onSkip}
    />
  );
}