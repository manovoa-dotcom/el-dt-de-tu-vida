"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { guardarResultados, type ActionResult } from "./actions";

type Item = {
  id: string;
  key: string;
  label: string;
  selection_type: "multiple" | "unica";
  points: number;
  sort_order: number;
};

type Convocado = {
  member_id: string;
  alias: string;
  is_invitado: boolean;
  photo_url: string | null;
};

type PartidoSelector = {
  number: number;
  status: string;
  kickoff_at: string;
};

type Props = {
  matchId: string;
  partidoActual: { number: number; kickoff_at: string; place: string | null };
  partidos: PartidoSelector[];
  items: Item[];
  convocados: Convocado[];
  existingWins: { item_id: string; member_id: string }[];
  existingFaltas: string[];
};

function snapshot(sel: Record<string, string[]>, faltas: string[]): string {
  const items = Object.keys(sel)
    .sort()
    .map((k) => `${k}:${[...sel[k]].sort().join(",")}`)
    .join("|");
  return `${items}##${[...faltas].sort().join(",")}`;
}

export default function ResultadosClient({
  matchId,
  partidoActual,
  partidos,
  items,
  convocados,
  existingWins,
  existingFaltas,
}: Props) {
  const router = useRouter();
  const [verSelector, setVerSelector] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    texto: string;
    tipo: "ok" | "error";
  } | null>(null);

  const seleccionesIniciales = useMemo(() => {
    const init: Record<string, string[]> = {};
    for (const w of existingWins) {
      if (!init[w.item_id]) init[w.item_id] = [];
      init[w.item_id].push(w.member_id);
    }
    return init;
  }, [existingWins]);

  const [selecciones, setSelecciones] =
    useState<Record<string, string[]>>(seleccionesIniciales);
  const [faltas, setFaltas] = useState<string[]>(existingFaltas);
  const [abierto, setAbierto] = useState<string | null>(
    items[0]?.id ?? null
  );

  const snapInicial = useMemo(
    () => snapshot(seleccionesIniciales, existingFaltas),
    [seleccionesIniciales, existingFaltas]
  );
  const snapActual = snapshot(selecciones, faltas);
  const hayCambios = snapActual !== snapInicial;

  function toggleItem(
    itemId: string,
    memberId: string,
    type: "multiple" | "unica"
  ) {
    setSelecciones((prev) => {
      const actual = prev[itemId] ?? [];
      if (type === "unica") {
        return {
          ...prev,
          [itemId]: actual.includes(memberId) ? [] : [memberId],
        };
      }
      return {
        ...prev,
        [itemId]: actual.includes(memberId)
          ? actual.filter((x) => x !== memberId)
          : [...actual, memberId],
      };
    });
  }

  function limpiarItem(itemId: string) {
    setSelecciones((prev) => ({ ...prev, [itemId]: [] }));
  }

  function toggleFalta(memberId: string) {
    setFaltas((prev) =>
      prev.includes(memberId)
        ? prev.filter((x) => x !== memberId)
        : [...prev, memberId]
    );
  }

  function guardar() {
    const wins = Object.entries(selecciones)
      .filter(([, ids]) => ids.length > 0)
      .map(([item_id, member_ids]) => ({ item_id, member_ids }));

    startTransition(async () => {
      const res: ActionResult = await guardarResultados(matchId, wins, faltas);
      if (res.ok) {
        setToast({ texto: "¡Resultados guardados!", tipo: "ok" });
        setTimeout(() => {
          router.push("/inicio");
          router.refresh();
        }, 1200);
      } else {
        setToast({ texto: res.error ?? "Error", tipo: "error" });
        setTimeout(() => setToast(null), 3000);
      }
    });
  }

  const itemsConSeleccion = items.filter(
    (i) => (selecciones[i.id] ?? []).length > 0
  ).length;
  const totalItems = items.length;
  const completo = itemsConSeleccion === totalItems;

  const fecha = new Date(partidoActual.kickoff_at);

  return (
    <div className="pb-32">
      {/* Toast flotante */}
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-medium shadow-2xl"
          style={{
            background: toast.tipo === "error" ? "var(--red)" : "var(--gold)",
            color: toast.tipo === "error" ? "#fff" : "#12261c",
          }}
        >
          {toast.texto}
        </div>
      )}

      {/* Selector de fecha */}
      <div className="relative mx-3 mt-3">
        <button
          type="button"
          onClick={() => setVerSelector((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: "var(--g1)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="text-left">
            <div className="bebas text-base" style={{ color: "var(--gold)" }}>
              FECHA {partidoActual.number}
            </div>
            <div className="text-[11px]" style={{ color: "var(--dim)" }}>
              {fecha.getDate()}/{fecha.getMonth() + 1}/
              {fecha.getFullYear().toString().slice(-2)}
              {partidoActual.place ? ` · ${partidoActual.place}` : ""}
            </div>
          </div>
          <span
            className="text-xs transition"
            style={{
              color: "var(--dim)",
              transform: verSelector ? "rotate(180deg)" : "rotate(0)",
            }}
          >
            ▼
          </span>
        </button>

        {verSelector && (
          <div
            className="absolute left-0 right-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-xl shadow-2xl"
            style={{
              background: "var(--g1)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {partidos.map((p) => {
              const activo = p.number === partidoActual.number;
              const jugada = p.status === "jugada" || p.status === "cerrada";
              const d = new Date(p.kickoff_at);
              return (
                <button
                  key={p.number}
                  type="button"
                  onClick={() => {
                    setVerSelector(false);
                    router.push(`/config/resultados?fecha=${p.number}`);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2 text-left"
                  style={{
                    background: activo ? "rgba(242,182,50,0.1)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: activo ? "var(--gold)" : "var(--tx)" }}
                    >
                      Fecha {p.number}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--dim)" }}>
                      {d.getDate()}/{d.getMonth() + 1} ·{" "}
                      {jugada ? "jugada" : "programada"}
                    </div>
                  </div>
                  {jugada && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{
                        background: "rgba(242,182,50,0.15)",
                        color: "var(--gold)",
                      }}
                    >
                      ✏️ editable
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel de progreso */}
      <div
        className="mx-3 mt-3 rounded-2xl p-4"
        style={{
          background: "var(--g1)",
          border: `1px solid ${
            completo ? "rgba(242,182,50,0.4)" : "rgba(255,255,255,0.06)"
          }`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--dim)" }}>
              Ítems con resultados
            </div>
            <div className="bebas text-3xl">
              {itemsConSeleccion} / {totalItems}
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: completo
                ? "rgba(242,182,50,0.2)"
                : "rgba(238,90,42,0.2)",
              color: completo ? "var(--gold)" : "var(--or)",
            }}
          >
            {completo ? "✓ Listo" : "Incompleto"}
          </span>
        </div>
        <div
          className="mt-3 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              background: completo ? "var(--gold)" : "var(--or)",
              width: `${(itemsConSeleccion / totalItems) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Ítems en acordeón */}
      {items.map((item) => (
        <ItemAccordion
          key={item.id}
          item={item}
          abierto={abierto === item.id}
          onToggle={() => setAbierto(abierto === item.id ? null : item.id)}
          seleccionados={selecciones[item.id] ?? []}
          convocados={convocados}
          onToggleJugador={(mid) =>
            toggleItem(item.id, mid, item.selection_type)
          }
          onLimpiar={() => limpiarItem(item.id)}
        />
      ))}

      {/* Faltó sin aviso */}
      <ItemAccordion
        item={{
          id: "__faltas__",
          key: "faltas",
          label: "🟥 Faltó sin aviso",
          selection_type: "multiple",
          points: 0,
          sort_order: 999,
        }}
        abierto={abierto === "__faltas__"}
        onToggle={() =>
          setAbierto(abierto === "__faltas__" ? null : "__faltas__")
        }
        seleccionados={faltas}
        convocados={convocados}
        onToggleJugador={(mid) => toggleFalta(mid)}
        onLimpiar={() => setFaltas([])}
        acento="var(--red)"
      />

      {/* Botón fijo abajo */}
      <div
        className="fixed left-0 right-0 z-40 border-t px-3 py-3"
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom))",
          background: "rgba(8,25,15,0.96)",
          borderColor: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={guardar}
          disabled={isPending || !hayCambios}
          className="w-full rounded-xl py-3 text-sm font-bold transition"
          style={{
            background: hayCambios ? "var(--or)" : "rgba(242,182,50,0.15)",
            color: hayCambios ? "#fff" : "var(--gold)",
            border: hayCambios ? "none" : "1px solid rgba(242,182,50,0.4)",
            opacity: isPending ? 0.5 : 1,
            cursor: hayCambios && !isPending ? "pointer" : "not-allowed",
          }}
        >
          {isPending
            ? "Guardando y calculando..."
            : !hayCambios
            ? "✓ Resultados guardados"
            : completo
            ? "Guardar resultados"
            : `Guardar igual (${itemsConSeleccion}/${totalItems})`}
        </button>
      </div>
    </div>
  );
}

function ItemAccordion({
  item,
  abierto,
  onToggle,
  seleccionados,
  convocados,
  onToggleJugador,
  onLimpiar,
  acento,
}: {
  item: Item;
  abierto: boolean;
  onToggle: () => void;
  seleccionados: string[];
  convocados: Convocado[];
  onToggleJugador: (memberId: string) => void;
  onLimpiar: () => void;
  acento?: string;
}) {
  const tiene = seleccionados.length > 0;
  const color = acento ?? "var(--gold)";
  const esMultiple = item.selection_type === "multiple";

  return (
    <div
      className="mx-3 mt-2 overflow-hidden rounded-2xl"
      style={{
        background: "var(--g1)",
        border: `1px solid ${
          tiene ? `${color}80` : "rgba(255,255,255,0.06)"
        }`,
        transition: "border-color 0.2s",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="bebas text-lg tracking-wide">{item.label}</span>
            {item.points > 0 && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: "rgba(242,182,50,0.15)",
                  color: "var(--gold)",
                }}
              >
                {item.points}p
              </span>
            )}
          </div>
          <div className="text-[11px]" style={{ color: "var(--dim)" }}>
            {esMultiple ? "Podés elegir varios" : "Elegí 1 solo"}
            {tiene &&
              ` · ${seleccionados.length} elegido${seleccionados.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        {tiene && (
          <div className="flex flex-none items-center gap-1">
            <div className="flex -space-x-2">
              {seleccionados.slice(0, 3).map((mid) => {
                const c = convocados.find((x) => x.member_id === mid);
                if (!c) return null;
                return (
                  <Avatar
                    key={mid}
                    alias={c.alias}
                    photoUrl={c.photo_url}
                    size={24}
                    ringColor={color}
                  />
                );
              })}
              {seleccionados.length > 3 && (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: color, color: "#fff" }}
                >
                  +{seleccionados.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
        <span
          className="flex-none text-xs transition"
          style={{
            color: "var(--dim)",
            transform: abierto ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          ▼
        </span>
      </button>

      {abierto && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {tiene && (
            <div className="flex justify-end px-4 pt-2">
              <button
                type="button"
                onClick={onLimpiar}
                className="rounded-full px-2 py-0.5 text-[11px] transition"
                style={{ color: "var(--red)" }}
              >
                Limpiar selección
              </button>
            </div>
          )}

          <div>
            {convocados.map((c) => {
              const sel = seleccionados.includes(c.member_id);
              return (
                <button
                  key={c.member_id}
                  type="button"
                  onClick={() => onToggleJugador(c.member_id)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left transition"
                  style={{
                    background: sel ? `${color}1a` : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Avatar alias={c.alias} photoUrl={c.photo_url} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {c.alias}
                    </div>
                    {c.is_invitado && (
                      <div className="text-[10px]" style={{ color: "var(--or)" }}>
                        Invitado
                      </div>
                    )}
                  </div>
                  {esMultiple ? (
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-md border text-[11px] font-bold transition"
                      style={{
                        borderColor: sel ? color : "rgba(255,255,255,0.25)",
                        background: sel ? color : "transparent",
                        color: sel ? "#fff" : "transparent",
                      }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-full border transition"
                      style={{
                        borderColor: sel ? color : "rgba(255,255,255,0.25)",
                        background: "transparent",
                      }}
                    >
                      {sel && (
                        <span
                          className="block h-2.5 w-2.5 rounded-full"
                          style={{ background: color }}
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}