"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const router = useRouter();
  const [activo, setActivo] = useState(false);
  const [pasoIdx, setPasoIdx] = useState(0);

  // Verificar si hay que arrancar automáticamente
  useEffect(() => {
    if (typeof window === "undefined") return;
    const visto = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!visto) {
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
    const pageBloqueada = paso.page;
    let pasosEnEstaPagina = 0;
    for (let i = pasoIdx; i < pasosDisponibles.length; i++) {
      if (pasosDisponibles[i].page === pageBloqueada) pasosEnEstaPagina++;
      else break;
    }

    // Avanza al siguiente paso, terminando si es el último
    const avanzarPaso = () => {
      if (pasoIdx >= pasosDisponibles.length - 1) terminar();
      else setPasoIdx(pasoIdx + 1);
    };

    // Navega a la página y avanza
    const irYAvanzar = () => {
      router.push(`/${paso.page}`);
      avanzarPaso();
    };

    // Saltea todos los pasos de esta página
    const saltarTodosDeEstaPagina = () => {
      let idx = pasoIdx;
      while (
        idx < pasosDisponibles.length &&
        pasosDisponibles[idx].page === pageBloqueada
      ) {
        idx++;
      }
      if (idx >= pasosDisponibles.length) terminar();
      else setPasoIdx(idx);
    };

    return (
      <GloboNavegacion
        paso={paso}
        pasoActual={pasoIdx}
        totalPasos={pasosDisponibles.length}
        pasosEnEstaPagina={pasosEnEstaPagina}
        onIr={irYAvanzar}
        onSaltar={saltarTodosDeEstaPagina}
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
  pasosEnEstaPagina,
  onIr,
  onSaltar,
  onPrev,
  onSkip,
}: {
  paso: PasoOnboarding;
  pasoActual: number;
  totalPasos: number;
  pasosEnEstaPagina: number;
  onIr: () => void;
  onSaltar: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const nombrePagina: Record<string, string> = {
    inicio: "Inicio",
    convocatoria: "Convocatoria",
    resultados: "Resultados",
  };

  const nombre = nombrePagina[paso.page] ?? paso.page;
  const texto =
    pasosEnEstaPagina > 1
      ? `El tutorial continúa en "${nombre}" con ${pasosEnEstaPagina} pasos.\n\nTocá "Ir a ${nombre}" y seguimos ahí. O si preferís, andá vos mismo con la barra de abajo.`
      : `El tutorial continúa en "${nombre}".\n\nTocá "Ir a ${nombre}" y seguimos ahí. O si preferís, andá vos mismo con la barra de abajo.`;

  return (
    <GloboComic
      pasoActual={pasoActual}
      totalPasos={totalPasos}
      titulo={`Vamos a ${nombre}`}
      texto={texto}
      targetId="onboarding-tabbar"
      posicion="arriba"
      botonSiguiente={`Ir a ${nombre} →`}
      onNext={onIr}
      onPrev={onPrev}
      onSkip={onSkip}
      linkSecundario={{
        label:
          pasosEnEstaPagina > 1
            ? `Saltar los ${pasosEnEstaPagina} pasos`
            : "Saltar este paso",
        onClick: onSaltar,
      }}
    />
  );
}