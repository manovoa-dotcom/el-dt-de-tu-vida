"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatearPuntos } from "@/lib/puntaje-dt";
import { regenerarPdfFecha } from "@/app/(app)/config/resultados/actions";

type PosicionPodio = {
  posicion: 1 | 2 | 3;
  alias: string;
  points: number;
};

export type FechaColeccion = {
  matchId: string;
  seasonId: string;
  seasonName: string;
  fecha: number;
  fechaTexto: string;
  kickoffAt: string;
  podio: PosicionPodio[];
  pdfUrl: string | null;
};

type Temporada = { id: string; name: string };
type Props = {
  fechas: FechaColeccion[];
  temporadas: Temporada[];
  esAdmin: boolean;
};

const MEDALLAS = {
  1: { icono: "🥇", nombre: "Oro", color: "#f2c94c" },
  2: { icono: "🥈", nombre: "Plata", color: "#c5d0d5" },
  3: { icono: "🥉", nombre: "Bronce", color: "#cd8b55" },
};

export default function ColeccionClient({
  fechas,
  temporadas,
  esAdmin,
}: Props) {
  const router = useRouter();
  const [temporada, setTemporada] = useState("todas");
  const [medalla, setMedalla] = useState("todas");
  const [orden, setOrden] = useState<"fecha" | "medalla">("fecha");
  const [matchEnProceso, setMatchEnProceso] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cartas = useMemo(() => {
    const filtradas = fechas
      .filter((fecha) => temporada === "todas" || fecha.seasonId === temporada)
      .flatMap((fecha) =>
        fecha.podio
          .filter(
            (ganador) =>
              medalla === "todas" || ganador.posicion === Number(medalla)
          )
          .map((ganador) => ({ fecha, ganador }))
      );

    return filtradas.sort((a, b) => {
      if (orden === "medalla" && a.ganador.posicion !== b.ganador.posicion) {
        return a.ganador.posicion - b.ganador.posicion;
      }
      return (
        new Date(b.fecha.kickoffAt).getTime() -
        new Date(a.fecha.kickoffAt).getTime()
      );
    });
  }, [fechas, medalla, orden, temporada]);

  function generarPdf(matchId: string) {
    setMatchEnProceso(matchId);
    setMensaje(null);
    startTransition(async () => {
      const result = await regenerarPdfFecha(matchId);
      setMensaje(result.ok ? result.message ?? "PDF generado" : result.error ?? "Error al generar PDF");
      setMatchEnProceso(null);
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="mx-3 mt-4">
      <div
        className="grid grid-cols-3 gap-2 rounded-xl p-3"
        style={{ background: "var(--g1)" }}
      >
        <label className="text-[10px]" style={{ color: "var(--dim)" }}>
          Temporada
          <select
            value={temporada}
            onChange={(event) => setTemporada(event.target.value)}
            className="mt-1 w-full rounded-lg px-2 py-2 text-xs"
            style={{ background: "var(--g0)", color: "var(--tx)" }}
          >
            <option value="todas">Todas</option>
            {temporadas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[10px]" style={{ color: "var(--dim)" }}>
          Medalla
          <select
            value={medalla}
            onChange={(event) => setMedalla(event.target.value)}
            className="mt-1 w-full rounded-lg px-2 py-2 text-xs"
            style={{ background: "var(--g0)", color: "var(--tx)" }}
          >
            <option value="todas">Todas</option>
            <option value="1">Oro</option>
            <option value="2">Plata</option>
            <option value="3">Bronce</option>
          </select>
        </label>

        <label className="text-[10px]" style={{ color: "var(--dim)" }}>
          Ordenar
          <select
            value={orden}
            onChange={(event) =>
              setOrden(event.target.value as "fecha" | "medalla")
            }
            className="mt-1 w-full rounded-lg px-2 py-2 text-xs"
            style={{ background: "var(--g0)", color: "var(--tx)" }}
          >
            <option value="fecha">Por fecha</option>
            <option value="medalla">Por medalla</option>
          </select>
        </label>
      </div>

      <p className="mt-2 px-1 text-[11px]" style={{ color: "var(--dim)" }}>
        {cartas.length} {cartas.length === 1 ? "carta" : "cartas"} · cada PDF
        contiene el podio completo de su fecha
      </p>

      {mensaje && (
        <p
          role="status"
          className="mt-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: "var(--g1)", color: "var(--tx)" }}
        >
          {mensaje}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {cartas.map(({ fecha, ganador }) => {
          const premio = MEDALLAS[ganador.posicion];
          const url = fecha.pdfUrl
            ? `${fecha.pdfUrl}#page=${ganador.posicion}`
            : null;
          return (
            <article
              key={`${fecha.matchId}-${ganador.posicion}`}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: "var(--g1)" }}
            >
              <span className="text-3xl" aria-label={`Medalla ${premio.nombre}`}>
                {premio.icono}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{ganador.alias}</p>
                <p className="text-[11px]" style={{ color: "var(--dim)" }}>
                  {fecha.seasonName} · Fecha {fecha.fecha} · {fecha.fechaTexto}
                </p>
                <p className="bebas mt-0.5 text-lg" style={{ color: premio.color }}>
                  {formatearPuntos(ganador.points)} pts
                </p>
              </div>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-3 py-2 text-center text-[11px] font-bold no-underline"
                  style={{ background: "var(--g0)", color: "var(--gold)" }}
                >
                  Ver PDF
                </a>
              ) : esAdmin ? (
                <button
                  type="button"
                  onClick={() => generarPdf(fecha.matchId)}
                  disabled={isPending}
                  className="rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50"
                  style={{ background: "var(--g0)", color: "var(--gold)" }}
                >
                  {isPending && matchEnProceso === fecha.matchId
                    ? "Generando…"
                    : "Generar PDF"}
                </button>
              ) : (
                <span className="max-w-20 text-right text-[10px]" style={{ color: "var(--dim)" }}>
                  PDF pendiente
                </span>
              )}
            </article>
          );
        })}
        {cartas.length === 0 && (
          <p
            className="rounded-xl p-5 text-center text-xs"
            style={{ background: "var(--g1)", color: "var(--dim)" }}
          >
            No hay cartas para esos filtros.
          </p>
        )}
      </div>
    </section>
  );
}
