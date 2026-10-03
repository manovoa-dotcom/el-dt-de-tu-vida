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

  // Arranque automático la primera vez
  useEffect(() => {
    if (typeof window === "undefined") return;
    const visto = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!visto) {
      const timer = setTimeout(() => setActivo(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Reabrir desde el botón "Ayuda"
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

  // Filtrar pasos según disponibilidad
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

  const avanzar = () => {
    if (pasoIdx >= pasosDisponibles.length - 1) terminar();
    else setPasoIdx(pasoIdx + 1);
  };

  const retroceder = () => setPasoIdx(Math.max(0, pasoIdx - 1));

  // ─────────────────────────────────────────────────────────────
  // Paso de tipo "navegacion": globo con botón para ir a otra pantalla
  // ─────────────────────────────────────────────────────────────
  if (paso.tipo === "navegacion") {
    const destino = paso.destino ?? "inicio";
    const nombreDestino: Record<string, string> = {
      inicio: "Inicio",
      convocatoria: "Convocatoria",
      resultados: "Resultados",
    };
    const yaEstoyAca = pathname.startsWith(`/${destino}`);

    const irYAvanzar = () => {
      if (!yaEstoyAca) {
        router.push(`/${destino}`);
      }
      // Si ya estoy acá, solo avanzo
      setTimeout(() => avanzar(), 50);
    };

    return (
      <GloboComic
        pasoActual={pasoIdx}
        totalPasos={pasosDisponibles.length}
        titulo={paso.tituloNavegacion ?? `Vamos a ${nombreDestino[destino]}`}
        texto={paso.textoNavegacion ?? ""}
        targetId={yaEstoyAca ? null : "onboarding-tabbar"}
        posicion={yaEstoyAca ? "centro" : "arriba"}
        botonSiguiente={
          yaEstoyAca
            ? "Siguiente →"
            : paso.botonNavegacion ?? `Ir a ${nombreDestino[destino]} →`
        }
        onNext={irYAvanzar}
        onPrev={retroceder}
        onSkip={terminar}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Paso de tipo "info": globo que apunta a un elemento
  // Si el paso es de otra pantalla, espera a que el usuario navegue
  // ─────────────────────────────────────────────────────────────
  const esDeEstaPantalla = pathname.startsWith(`/${paso.page}`);

  if (!esDeEstaPantalla) {
    // El paso es de otra pantalla. Mostramos un aviso de "andá a X".
    // Esto solo pasa si el usuario salteó el paso de navegación previo.
    const nombrePagina: Record<string, string> = {
      inicio: "Inicio",
      convocatoria: "Convocatoria",
      resultados: "Resultados",
    };
    const nombre = nombrePagina[paso.page ?? "inicio"];

    return (
      <GloboComic
        pasoActual={pasoIdx}
        totalPasos={pasosDisponibles.length}
        titulo={`Andá a ${nombre}`}
        texto={`Este paso se muestra en la pestaña "${nombre}". Andá ahí con la barra de abajo y continuamos.`}
        targetId="onboarding-tabbar"
        posicion="arriba"
        botonSiguiente="Saltar este paso →"
        onNext={avanzar}
        onPrev={retroceder}
        onSkip={terminar}
      />
    );
  }

  return (
    <GloboComic
      pasoActual={pasoIdx}
      totalPasos={pasosDisponibles.length}
      titulo={paso.titulo ?? ""}
      texto={paso.texto ?? ""}
      targetId={paso.target ?? null}
      posicion={paso.posicion ?? "centro"}
      botonSiguiente={paso.botonSiguiente}
      onNext={avanzar}
      onPrev={retroceder}
      onSkip={terminar}
    />
  );
}