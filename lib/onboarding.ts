// ═══════════════════════════════════════════════════════════════
// TEXTOS DEL ONBOARDING
// Editá libremente los textos. Para sacar un paso, borrá su objeto
// del array. Para agregar uno, copiá uno existente y editalo.
//
// Tipos de paso:
//   - "info":       Globo que apunta a un elemento de la pantalla.
//   - "navegacion": Globo con botón que te lleva a otra pantalla.
// ═══════════════════════════════════════════════════════════════

export type PasoOnboarding = {
  id: string;
  tipo: "info" | "navegacion";

  // ─── Para tipo "info" ───
  page?: "inicio" | "convocatoria" | "resultados";
  target?: string | null;
  posicion?: "arriba" | "abajo" | "izquierda" | "derecha" | "centro";
  titulo?: string;
  texto?: string;
  botonSiguiente?: string;
  requierePartidoJugado?: boolean;

  // ─── Para tipo "navegacion" ───
  destino?: "inicio" | "convocatoria" | "resultados";
  tituloNavegacion?: string;
  textoNavegacion?: string;
  botonNavegacion?: string;
};

export const PASOS_ONBOARDING: PasoOnboarding[] = [
  // ─── Paso 1: Bienvenida ───
  {
    id: "bienvenida",
    tipo: "info",
    page: "inicio",
    target: null,
    posicion: "centro",
    titulo: "¡Hola! Soy tu asistente",
    texto:
      "Te muestro en pocos pasos cómo funciona el juego. Después ya vas a saber jugar solo. ¿Arrancamos?",
    botonSiguiente: "¡Dale!",
  },

  // ─── Paso 2: Anotarse ───
  {
    id: "anotarse",
    tipo: "info",
    page: "inicio",
    target: "onboarding-btn-anotarse",
    posicion: "arriba",
    titulo: "¿Vas a jugar el partido?",
    texto:
      "Anotate acá. Y además, SIEMPRE, armá tu equipo de fantasía con los convocados.\n\nSi solo querés jugar como DT (sin ir a la cancha), no te anotes y seguí al próximo paso.",
  },

  // ─── Paso 3: Navegación a Convocatoria ───
  {
    id: "nav-convocatoria",
    tipo: "navegacion",
    destino: "convocatoria",
    tituloNavegacion: "Vamos a Convocatoria",
    textoNavegacion:
      "Acá es donde armás tu equipo de fantasía con los jugadores que van a la cancha.",
    botonNavegacion: "Ir a Convocatoria →",
  },

  // ─── Paso 4: Convocados ───
  {
    id: "convocados",
    tipo: "info",
    page: "convocatoria",
    target: "onboarding-convocados",
    posicion: "arriba",
    titulo: "Los que van a jugar",
    texto:
      "Acá ves quiénes van a jugar esta fecha. Si te anotaste, aparecés vos también.\n\n¿No vas a ir? No hay problema, igual elegís a los que sí van.",
  },

  // ─── Paso 5: Titulares ───
  {
    id: "titulares",
    tipo: "info",
    page: "convocatoria",
    target: "onboarding-botones-ts",
    posicion: "izquierda",
    titulo: "Armá tu equipo",
    texto:
      "Elegí 5 titulares (T) y 1 suplente (S) entre los convocados.\n\nHay un presupuesto limitado: cada jugador tiene un valor. Se guarda solo, no hace falta apretar nada.",
  },

  // ─── Paso 6: Mi equipo ───
  {
    id: "mi-equipo",
    tipo: "info",
    page: "convocatoria",
    target: "onboarding-mi-equipo",
    posicion: "abajo",
    titulo: "Tu equipo",
    texto:
      "Acá ves tu equipo, el presupuesto y los titulares que elegiste.\n\nSe cierra 10 minutos antes del partido. Después ya no se puede tocar.",
  },

  // ─── Paso 7: Navegación a Resultados (solo si hay partido jugado) ───
  {
    id: "nav-resultados",
    tipo: "navegacion",
    destino: "resultados",
    tituloNavegacion: "Y después del partido…",
    textoNavegacion:
      "Cuando se juegue, el admin carga los resultados y ves los puntos acá.\n\nSumás por goles, atajadas y todo lo que hagan tus jugadores.\n\n¡Que gane el mejor DT!",
    botonNavegacion: "Ir a Resultados →",
    requierePartidoJugado: true,
  },
];

export const ONBOARDING_STORAGE_KEY = "el_dt_onboarding_visto";