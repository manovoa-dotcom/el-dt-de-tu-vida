"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { guardarConfigGrupo } from "./actions";

type Grupo = {
  name: string;
 slug: string;
  presentismo_value: number;
  dt_pick_value: number;
  equipo_ideal_value: number;
  equipo_ideal_anio_size: number;
  invite_code: string | null;
};

export default function ConfigGrupoClient({ grupo }: { grupo: Grupo }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const inicial = useMemo(
    () => ({
      name: grupo.name,
      presentismo_value: grupo.presentismo_value,
      dt_pick_value: grupo.dt_pick_value,
      equipo_ideal_value: grupo.equipo_ideal_value,
      equipo_ideal_anio_size: grupo.equipo_ideal_anio_size,
    }),
    [grupo]
  );

   const [form, setForm] = useState(inicial);
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const hayCambios = useMemo(() => {
    return (
      form.name !== inicial.name ||
      form.presentismo_value !== inicial.presentismo_value ||
      form.dt_pick_value !== inicial.dt_pick_value ||
      form.equipo_ideal_value !== inicial.equipo_ideal_value ||
      form.equipo_ideal_anio_size !== inicial.equipo_ideal_anio_size
    );
  }, [form, inicial]);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function guardar() {
    startTransition(async () => {
      const res = await guardarConfigGrupo(form);
      if (res.ok) {
        setGuardado(true);
        mostrarToast(res.message ?? "Configuración guardada");
        setTimeout(() => setGuardado(false), 2500);
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error");
      }
    });
  }

   const linkInvite = grupo.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/unirse/${grupo.slug}`
    : null;

  let textoBoton = "Guardar cambios";
  if (isPending) textoBoton = "Guardando y recalculando...";
  else if (guardado) textoBoton = "✓ Guardado";
  else if (!hayCambios) textoBoton = "✓ Sin cambios";

  const puedeGuardar = hayCambios && !isPending;

  return (
    <div className="mx-3 mt-3 space-y-4">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      {/* Nombre del grupo */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <label
          className="mb-2 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--dim)" }}
        >
          Nombre del grupo
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          maxLength={40}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--tx)",
          }}
        />

               {linkInvite && (
          <div className="mt-3">
            <div
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--dim)" }}
            >
              Link de invitación
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(linkInvite);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  mostrarToast("No se pudo copiar. Copialo a mano.");
                }
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition"
              style={{
                background: copiado
                  ? "rgba(242,182,50,0.2)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  copiado ? "rgba(242,182,50,0.5)" : "rgba(255,255,255,0.08)"
                }`,
              }}
            >
              <span
                className="flex-1 truncate text-[11px]"
                style={{
                  color: "var(--gold)",
                  fontFamily: "monospace",
                }}
              >
                {linkInvite}
              </span>
              <span
                className="flex-none text-[11px] font-bold"
                style={{ color: copiado ? "var(--gold)" : "var(--dim)" }}
              >
                {copiado ? "✓ Copiada" : "📋 Copiar"}
              </span>
            </button>
            <p className="mt-1 text-[10px]" style={{ color: "var(--dim)" }}>
              Tocá el link para copiarlo y pegalo en el chat de WhatsApp.
            </p>
            <p className="mt-0.5 text-[10px]" style={{ color: "var(--dim)" }}>
              Código: {grupo.invite_code}
            </p>
          </div>
        )}
      </div>

      {/* Valores del campeonato */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="bebas mb-1 text-lg tracking-wider"
          style={{ color: "var(--gold)" }}
        >
          VALORES DEL CAMPEONATO
        </div>
        <p className="mb-3 text-[11px]" style={{ color: "var(--dim)" }}>
          Definen cuánto vale un jugador para armar el equipo de la próxima fecha.
          Al guardar se recalculan automáticamente.
        </p>

        <div className="space-y-3">
          <ValorInput
            label="Presentismo"
            hint="Si jugó la fecha anterior"
            value={form.presentismo_value}
            onChange={(v) => setForm({ ...form, presentismo_value: v })}
          />
          <ValorInput
            label="Por DT que lo eligió"
            hint="Cuánto suma cada DT que lo puso en su equipo"
            value={form.dt_pick_value}
            onChange={(v) => setForm({ ...form, dt_pick_value: v })}
          />
          <ValorInput
            label="Equipo Ideal"
            hint="Si estuvo en el Equipo Ideal de la fecha anterior"
            value={form.equipo_ideal_value}
            onChange={(v) => setForm({ ...form, equipo_ideal_value: v })}
          />
          <ValorInput
            label="Formato equipo ideal del año"
            hint="Cantidad de jugadores (5 a 11) + 1 DT"
            value={form.equipo_ideal_anio_size}
            onChange={(v) => setForm({ ...form, equipo_ideal_anio_size: v })}
            min={5}
            max={11}
          />
        </div>
      </div>

      {/* Botón guardar */}
      <button
        type="button"
        onClick={guardar}
        disabled={!puedeGuardar}
        className="w-full rounded-xl py-3 text-sm font-bold transition"
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

      <p className="text-center text-[10px]" style={{ color: "var(--dim)" }}>
        Al guardar, se recalculan los valores del próximo partido automáticamente.
      </p>
    </div>
  );
}

function ValorInput({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-bold transition"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              color: "var(--dim)",
            }}
          >
            −
          </button>
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (isNaN(v)) {
                onChange(min);
                return;
              }
              let res = Math.max(min, v);
              if (max !== undefined) res = Math.min(max, res);
              onChange(res);
            }}
            min={min}
            max={max}
            className="w-14 rounded-lg px-2 py-1 text-center text-sm font-bold outline-none"
            style={{
              background: "rgba(242,182,50,0.15)",
              border: "1px solid rgba(242,182,50,0.4)",
              color: "var(--gold)",
            }}
          />
          <button
            type="button"
            onClick={() =>
              onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-bold transition"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              color: "var(--dim)",
            }}
          >
            +
          </button>
        </div>
      </div>
      <div className="text-[11px]" style={{ color: "var(--dim)" }}>
        {hint}
      </div>
    </div>
  );
}