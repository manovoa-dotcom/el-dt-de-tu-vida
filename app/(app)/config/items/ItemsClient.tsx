"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { crearItem, guardarItems } from "./actions";
import type { Item } from "./page";

export default function ItemsClient({
  items,
  bloqueado,
}: {
  items: Item[];
  bloqueado: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const inicial = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        active: i.active,
        points: i.points,
      })),
    [items]
  );

  const [form, setForm] = useState(inicial);
  const [guardado, setGuardado] = useState(false);
  const [nuevoLabel, setNuevoLabel] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<"multiple" | "unica">("multiple");
  const [nuevoPuntos, setNuevoPuntos] = useState(1);

  useEffect(() => {
    setForm(inicial);
  }, [inicial]);

  const hayCambios = useMemo(() => {
    if (form.length !== inicial.length) return true;
    for (let i = 0; i < form.length; i++) {
      if (
        form[i].active !== inicial[i].active ||
        form[i].points !== inicial[i].points
      ) {
        return true;
      }
    }
    return false;
  }, [form, inicial]);

  const activosCount = form.filter((f) => f.active).length;
  const puedeGuardar =
    hayCambios && activosCount >= 4 && !isPending && !bloqueado;

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function toggleActivo(id: string) {
    setForm((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  }

  function cambiarPuntos(id: string, delta: number) {
    setForm((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, points: Math.max(0, f.points + delta) }
          : f
      )
    );
  }

  function setPuntos(id: string, valor: number) {
    setForm((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, points: Math.max(0, valor) }
          : f
      )
    );
  }

  function guardar() {
    startTransition(async () => {
      const res = await guardarItems(form);
      if (res.ok) {
        setGuardado(true);
        mostrarToast("Ítems guardados");
        setTimeout(() => setGuardado(false), 2500);
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error");
      }
    });
  }

  function agregarItem() {
    if (hayCambios) {
      mostrarToast("Guardá los cambios actuales antes de agregar un ítem");
      return;
    }
    startTransition(async () => {
      const res = await crearItem({
        label: nuevoLabel,
        selection_type: nuevoTipo,
        points: nuevoPuntos,
      });
      if (!res.ok) {
        mostrarToast(res.error ?? "Error al agregar el ítem");
        return;
      }
      setNuevoLabel("");
      setNuevoTipo("multiple");
      setNuevoPuntos(1);
      mostrarToast("Ítem agregado");
      router.refresh();
    });
  }

  let textoBoton = "Guardar cambios";
  if (bloqueado) textoBoton = "🔒 Bloqueado";
  else if (isPending) textoBoton = "Guardando...";
  else if (guardado) textoBoton = "✓ Guardado";
  else if (!hayCambios) textoBoton = "✓ Sin cambios";
  else if (activosCount < 4) textoBoton = "Necesitás 4 ítems activos";

  return (
    <div className="mx-3 mt-3">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      {/* Cartel de bloqueo */}
      {bloqueado && (
        <div
          className="mb-3 rounded-2xl p-4"
          style={{
            background: "rgba(242,182,50,0.1)",
            border: "1px solid rgba(242,182,50,0.4)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <div
                className="bebas text-base tracking-wide"
                style={{ color: "var(--gold)" }}
              >
                BLOQUEADO POR PARTIDO EN CURSO
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--tx)" }}>
                Los ítems no se pueden modificar mientras haya un partido
                programado pendiente. Esperá a que termine la fecha.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div
        className="mb-3 rounded-2xl p-4"
        style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--dim)" }}>
              Ítems activos
            </div>
            <div className="bebas text-3xl">
              {activosCount} / {form.length}
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background:
                activosCount >= 4
                  ? "rgba(242,182,50,0.15)"
                  : "rgba(226,59,77,0.15)",
              color: activosCount >= 4 ? "var(--gold)" : "var(--red)",
            }}
          >
            {activosCount >= 4 ? "✓ Listo" : "Mínimo: 4"}
          </span>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: "var(--dim)" }}>
          Los ítems activos son los que aparecen en la carga de resultados.
          Darle valores distintos a cada uno ayuda a evitar empates.
        </p>
      </div>

      {/* Crear un ítem nuevo */}
      <div
        className="mb-3 rounded-2xl p-4"
        style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="bebas mb-3 text-lg tracking-wide">AGREGAR ÍTEM</div>
        <label className="mb-1 block text-[11px]" style={{ color: "var(--dim)" }}>
          Nombre
        </label>
        <input
          type="text"
          value={nuevoLabel}
          onChange={(e) => setNuevoLabel(e.target.value)}
          maxLength={60}
          placeholder="Ej.: Mejor asistencia"
          disabled={bloqueado || isPending}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--tx)", border: "1px solid rgba(255,255,255,0.12)" }}
        />
        <div className="mt-3 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[11px]" style={{ color: "var(--dim)" }}>
              Tipo de selección
            </label>
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as "multiple" | "unica")}
              disabled={bloqueado || isPending}
              className="w-full rounded-lg px-2 py-2 text-xs outline-none disabled:opacity-50"
              style={{ background: "var(--g2)", color: "var(--tx)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <option value="multiple">Selección múltiple</option>
              <option value="unica">Selección única</option>
            </select>
          </div>
          <div className="w-20 flex-none">
            <label className="mb-1 block text-[11px]" style={{ color: "var(--dim)" }}>
              Puntos
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={nuevoPuntos}
              onChange={(e) => setNuevoPuntos(Math.max(0, parseInt(e.target.value, 10) || 0))}
              disabled={bloqueado || isPending}
              className="w-full rounded-lg px-2 py-2 text-center text-sm outline-none disabled:opacity-50"
              style={{ background: "rgba(242,182,50,0.15)", border: "1px solid rgba(242,182,50,0.4)", color: "var(--gold)" }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={agregarItem}
          disabled={bloqueado || isPending || nuevoLabel.trim().length < 2 || hayCambios}
          className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--or)", color: "#fff" }}
        >
          {isPending ? "Guardando..." : "＋ Agregar ítem"}
        </button>
        {hayCambios && (
          <p className="mt-2 text-[10px]" style={{ color: "var(--dim)" }}>
            Guardá primero los cambios de la lista para agregar un ítem.
          </p>
        )}
      </div>

      {/* Lista de ítems */}
      {items.map((item) => {
        const f = form.find((x) => x.id === item.id);
        if (!f) return null;

        return (
          <div
            key={item.id}
            className="mt-2 rounded-2xl transition"
            style={{
              background: "var(--g1)",
              border: `1px solid ${
                f.active ? "rgba(242,182,50,0.3)" : "rgba(255,255,255,0.06)"
              }`,
              opacity: f.active ? 1 : 0.5,
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => toggleActivo(item.id)}
                disabled={bloqueado}
                className="flex h-6 w-6 flex-none items-center justify-center rounded-md border text-[11px] font-bold transition disabled:opacity-50"
                style={{
                  borderColor: f.active ? "var(--gold)" : "rgba(255,255,255,0.25)",
                  background: f.active ? "var(--gold)" : "transparent",
                  color: f.active ? "#12261c" : "transparent",
                }}
              >
                ✓
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {item.label}
                </div>
                <div className="text-[10px]" style={{ color: "var(--dim)" }}>
                  {item.selection_type === "multiple"
                    ? "Selección múltiple"
                    : "Selección única"}
                </div>
              </div>

              <div className="flex flex-none items-center gap-2">
                <button
                  type="button"
                  onClick={() => cambiarPuntos(item.id, -1)}
                  disabled={bloqueado || !f.active || f.points <= 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-bold transition disabled:opacity-30"
                  style={{
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "var(--dim)",
                  }}
                >
                  −
                </button>
                               <input
                  type="number"
                  value={f.points}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setPuntos(item.id, isNaN(v) ? 0 : v);
                  }}
                  disabled={bloqueado || !f.active}
                  min={0}
                  className="w-14 rounded-lg px-2 py-1 text-center text-sm font-bold outline-none disabled:opacity-50"
                  style={{
                    background: "rgba(242,182,50,0.15)",
                    border: "1px solid rgba(242,182,50,0.4)",
                    color: "var(--gold)",
                  }}
                />
                  <button
                  type="button"
                  onClick={() => cambiarPuntos(item.id, 1)}
                  disabled={bloqueado || !f.active}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-bold transition disabled:opacity-30"
                  style={{
                    borderColor: "rgba(255,255,255,0.15)",
                    color: "var(--dim)",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Botón guardar */}
      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="mt-4 w-full rounded-xl py-3 text-sm font-bold transition"
        style={{
          background: guardado
            ? "rgba(242,182,50,0.15)"
            : puedeGuardar
            ? "var(--or)"
            : "rgba(238,90,42,0.4)",
          color: guardado ? "var(--gold)" : "#fff",
          border: guardado ? "1px solid rgba(242,182,50,0.4)" : "none",
          cursor: puedeGuardar ? "pointer" : "not-allowed",
        }}
      >
        {textoBoton}
      </button>
    </div>
  );
}
