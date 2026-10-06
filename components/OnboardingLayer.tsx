"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const esperandoRef = useRef(false);

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
      esperandoRef.current = false;
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
    esperandoRef.current = false;
    setPasoIdx((prev) => Math.max(0, prev - 1));
  };

  // ─── Esperar a que la página Y el target estén listos ───
  useEffect(() => {
    if (!esperandoDestino) return;
    if (!pathname.startsWith(`/${esperandoDestino}`)) return;

    // Ya estamos en la página. Pero puede que esté mostrando un skeleton.
    // Vamos a esperar a que el TARGET del próximo paso exista en el DOM.
    const nextPaso = pasosDisponibles[pasoIdx + 1];

    // Si el próximo paso no tiene target (o es navegación), avanzamos directo
    if (
      !nextPaso ||
      nextPaso.tipo !== "info" ||
      !nextPaso.target
    ) {
      const timer = setTimeout(() => {
        setEsperandoDestino(null);
        esperandoRef.current = false;
        avanzar();
      }, 300);
      return () => clearTimeout(timer);
    }

    const targetId = nextPaso.target;
    let intentos = 0;
    const maxIntentos = 30; // 3 segundos máximo

    const intervalo = setInterval(() => {
      intentos++;
      const el = document.getElementById(targetId);
      if (el) {
        clearInterval(intervalo);
        // Pequeño delay para que la página termine de acomodarse
        setTimeout(() => {
          setEsperandoDestino(null);
          esperandoRef.current = false;
          avanzar();
        }, 200);
      } else if (intentos >= maxIntentos) {
        // Timeout: avanzamos igual
        clearInterval(intervalo);
        setEsperandoDestino(null);
        esperandoRef.current = false;
        avanzar();
      }
    }, 100);

    return () => clearInterval(intervalo);
  }, [pathname, esperandoDestino, pasoIdx, pasosDisponibles, avanzar]);

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
      if (esperandoRef.current) return; // ya está esperando
      if (yaEstoyAca) {
        avanzar();
      } else {
        esperandoRef.current = true;
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
            ? "⏳ Cargando..."
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
      centradoX={paso.centradoX ?? false}
      onNext={avanzar}
      onPrev={retroceder}
      onSkip={terminar}
    />
  );
}