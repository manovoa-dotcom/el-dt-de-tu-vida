export function calcularPuntajeDT(
  picks: readonly { slot: string; points: number }[]
): number {
  return picks.reduce((total, pick) => {
    if (pick.slot === "titular") return total + pick.points;
    if (pick.slot === "suplente") return total + pick.points / 2;
    return total;
  }, 0);
}

export function formatearPuntos(points: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 1,
  }).format(points);
}
