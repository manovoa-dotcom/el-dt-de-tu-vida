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
  const [esperandoDestino, setEsperandoDestino] = useState<string | null>(null);

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
      setEsperandoDestino(null);
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

  const avanzar = useCallback(() => {
    setPasoIdx((prev) => {
      if (prev >= pasosDisponibles.length - 1) {
        terminar();
        return prev;
      }
      return prev + 1;
    });
  }, [pasosDisponibles.length, terminar]);

  const retroceder = () => {
    setEsperandoDestino(null);
    setPasoIdx((prev) => Math.max(0, prev - 1));
  };

  // Detectar cuando el pathname coincide con el destino esperado → avanzar
  useEffect(() => {
    if (!esperandoDestino) return;
    if (pathname.startsWith(`/${esperandoDestino}`)) {
      setEsperandoDestino(null);
      avanzar();
    }
  }, [pathname, esperandoDestino, avanzar]);

  if (!activo) return null;

  const paso = pasosDisponibles[pasoIdx];
  if (!paso) {
    terminar();
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // Paso de tipo "navegacion"
  // ─────────────────────────────────────────────────────────────
  if (paso.tipo === "navegacion") {
    const destino = paso.destino ?? "inicio";
    const nombreDestino: Record<string, string> = {
      inicio: "Inicio",
      convocatoria: "Convocatoria",
      resultados: "Resultados",
    };
    const yaEstoyAca = pathname.startsWith(`/${destino}`);
    const esperando = esperandoDestino === destino;

    const irAlDestino = () => {
      if (yaEstoyAca) {
        avanzar();
      } else {
        setEsperandoDestino(destino);
        router.push(`/${destino}`);
      }
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
          esperando
            ? "Navegando…"
            : paso.botonNavegacion ?? `Ir a ${nombreDestino[destino]} →`
        }
        onNext={irAlDestino}
        onPrev={retroceder}
        onSkip={terminar}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Paso de tipo "info"
  // ─────────────────────────────────────────────────────────────
  const esDeEstaPantalla = pathname.startsWith(`/${paso.page}`);

  if (!esDeEstaPantalla) {
    // Caso de emergencia: el paso es de otra pantalla sin haber pasado
    // por un paso de navegación. Se saltea automáticamente.
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