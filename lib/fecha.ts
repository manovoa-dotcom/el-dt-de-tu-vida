// Utilidades para mostrar fechas/horas SIEMPRE en hora argentina (UTC-3),
// sin importar dónde corre el server (Vercel usa UTC).

const TZ_OFFSET_MIN = -180; // -03:00 en minutos

// Suma el offset de Argentina a un Date (para usar con getHours/getMinutes).
function aHoraAR(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60 * 1000);
}

export function formatearHoraAR(iso: string): string {
  const d = aHoraAR(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatearFechaAR(iso: string): {
  dia: number;
  mes: number;
  anio: number;
  diaSemana: number;
} {
  const d = aHoraAR(iso);
  return {
    dia: d.getUTCDate(),
    mes: d.getUTCMonth(),
    anio: d.getUTCFullYear(),
    diaSemana: d.getUTCDay(),
  };
}

export function formatearFechaCortaAR(iso: string): string {
  const { dia, mes } = formatearFechaAR(iso);
  return `${dia}/${mes + 1}`;
}

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];