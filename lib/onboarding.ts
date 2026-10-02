// ═══════════════════════════════════════════════════════════════
// TEXTOS DEL ONBOARDING
// Editá libremente los textos de cada paso. Para sacar un paso,
// borrá su objeto del array. Para agregar uno, copiá uno existente
// y editalo.
// ═══════════════════════════════════════════════════════════════

export type PasoOnboarding = {
  id: string;
  page: "inicio" | "convocatoria" | "resultados";
  target: string | null; // ID del elemento que apunta. null = centrado
  posicion: "arriba" | "abajo" | "izquierda" | "derecha" | "centro";
  titulo: string;
  texto: string;
  botonSiguiente?: string; // texto custom del botón
  requierePartidoJugado?: boolean; // solo se muestra si hay partido jugado
};

export const PASOS_ONBOARDING: PasoOnboarding[] = [
  // ─── Paso 1: Bienvenida ───
  {
    id: "bienvenida",
    page: "inicio",
    target: null,
    posicion: "centro",
    titulo: "¡Hola! Soy tu asistente",
    texto:
      "Te muestro en 5 pasos cómo funciona el juego. Después ya vas a saber jugar solo. ¿Arrancamos?",
    botonSiguiente: "¡Dale!",
  },

  // ─── Paso 2: Anotarse o solo ser DT ───
  {
    id: "anotarse",
    page: "inicio",
    target: "onboarding-btn-anotarse",
    posicion: "arriba",
    titulo: "¿Vas a jugar el partido?",
    texto:
      "Anotate acá. Y además, SIEMPRE, armá tu equipo de fantasía con los convocados.\n\nSi solo querés jugar como DT (sin ir a la cancha), no te anotes y pasá directo al siguiente paso para armar tu equipo.",
  },

  // ─── Paso 3: Convocatoria ───
  {
    id: "convocatoria",
    page: "convocatoria",
    target: "onboarding-convocados",
    posicion: "arriba",
    titulo: "Los que van a jugar",
    texto:
      "Acá ves quiénes van a jugar esta fecha. Si te anotaste, aparecés vos también.\n\n¿No vas a ir? No hay problema, igual elegís a los que sí van.",
  },

  // ─── Paso 4: Elegir titulares ───
  {
    id: "titulares",
    page: "convocatoria",
    target: "onboarding-botones-ts",
    posicion: "izquierda",
    titulo: "Armá tu equipo",
    texto:
      "Elegí 5 titulares (T) y 1 suplente (S) entre los convocados.\n\nHay un presupuesto limitado: cada jugador tiene un valor. Se guarda solo, no hace falta apretar nada.",
  },

  // ─── Paso 5: Ver tu equipo ───
  {
    id: "mi-equipo",
    page: "convocatoria",
    target: "onboarding-mi-equipo",
    posicion: "abajo",
    titulo: "Tu equipo",
    texto:
      "Acá ves tu equipo, el presupuesto y los titulares que elegiste.\n\nSe cierra 10 minutos antes del partido. Después ya no se puede tocar.",
  },

  // ─── Paso 6: Resultados ───
  {
    id: "resultados",
    page: "inicio",
    target: "onboarding-tab-resultados",
    posicion: "arriba",
    titulo: "Y después del partido…",
    texto:
      "Cuando se juegue, el admin carga los resultados y ves los puntajes acá en Resultados.\n\nSumás puntos por goles, atajadas y todo lo que hagan tus jugadores.\n\n¡Que gane el mejor DT!",
    botonSiguiente: "¡Terminar!",
    requierePartidoJugado: true,
  },
];

export const ONBOARDING_STORAGE_KEY = "el_dt_onboarding_visto";