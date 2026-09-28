"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { guardarPartido, type ActionResult } from "./actions";

type Partido = {
  id: string;
  number: number;
  kickoff_at: string;
  place: string | null;
  cupo: number;
  budget: number | null;
};

type FormState = {
  kickoff: string;
  place: string;
  cupo: number;
  presupuesto: string;
  infinito: boolean;
};

export default function PartidoForm({ partido }: { partido: Partido | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  // Estado inicial
  const inicial: FormState = useMemo(() => {
    if (!partido) {
      return {
        kickoff: "",
        place: "",
        cupo: 10,
        presupuesto: "",
        infinito: false,
      };
    }
    const d = new Date(partido.kickoff_at);
    const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000);
    const kickoffLocal = ar.toISOString().slice(0, 16);
    return {
      kickoff: kickoffLocal,
      place: partido.place ?? "",
      cupo: partido.cupo,
      presupuesto: partido.budget === null ? "" : String(partido.budget),
      infinito: partido.budget === null,
    };
  }, [partido]);

  const [form, setForm] = useState<FormState>(inicial);
  const [guardado, setGuardado] = useState(false);

  // Comparar si hay cambios
  const hayCambios = useMemo(() => {
    return (
      form.kickoff !== inicial.kickoff ||
      form.place !== inicial.place ||
      form.cupo !== inicial.cupo ||
      form.presupuesto !== inicial.presupuesto ||
      form.infinito !== inicial.infinito
    );
  }, [form, inicial]);

  // El botón se activa si:
  // - Hay cambios respecto al inicial, o
  // - Es un partido nuevo (no hay inicial), o
  // - Ya se guardó pero hubo más cambios
  const puedeGuardar = partido ? hayCambios : form.kickoff !== "";

  function actualizar<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setGuardado(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeGuardar) return;

    const fd = new FormData();
    fd.set("kickoff", form.kickoff);
    fd.set("place", form.place);
    fd.set("cupo", String(form.cupo));
    fd.set("presupuesto", form.presupuesto);
    if (form.infinito) fd.set("infinito", "on");
    if (partido) fd.set("match_id", partido.id);

    startTransition(async () => {
      const res: ActionResult = await guardarPartido({ ok: true }, fd);
      if (res.ok) {
        setGuardado(true);
        setToast("Partido guardado");
        setTimeout(() => {
          router.refresh();
          router.push("/inicio");
        }, 1200);
      } else {
        setToast(res.error ?? "Error");
        setTimeout(() => setToast(null), 2500);
      }
    });
  }

  let textoBoton = partido ? "Guardar cambios" : "Crear partido";
  if (isPending) textoBoton = "Guardando...";
  else if (guardado) textoBoton = "✓ Guardado";
  else if (partido && !hayCambios) textoBoton = "✓ Sin cambios";
  else if (!partido && form.kickoff === "") textoBoton = "Cargá fecha y hora";

  return (
    <form onSubmit={handleSubmit} className="mx-3 mt-3 space-y-4">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      {/* Fecha y hora */}
      <div>
        <label
          className="mb-1 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--dim)" }}
        >
          Fecha y hora del partido
        </label>
        <input
          type="datetime-local"
          value={form.kickoff}
          onChange={(e) => actualizar("kickoff", e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--tx)",
          }}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          La baja cierra 3 h antes. Los equipos se cierran 10 min antes.
        </p>
      </div>

      {/* Lugar */}
      <div>
        <label
          className="mb-1 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--dim)" }}
        >
          Lugar
        </label>
        <input
          type="text"
          value={form.place}
          onChange={(e) => actualizar("place", e.target.value)}
          placeholder="Ej: Cancha 1 · Fútbol 5 La Red"
          maxLength={80}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--tx)",
          }}
        />
      </div>

      {/* Cupo */}
      <div>
        <label
          className="mb-1 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--dim)" }}
        >
          Cupo total
        </label>
        <select
          value={form.cupo}
          onChange={(e) => actualizar("cupo", parseInt(e.target.value, 10))}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--tx)",
          }}
        >
          {[10, 12, 14, 16, 18, 20, 22].map((n) => (
            <option key={n} value={n} style={{ color: "#000" }}>
              {n} jugadores ({n / 2} vs {n / 2})
            </option>
          ))}
        </select>
      </div>

      {/* Presupuesto */}
      <div>
        <label
          className="mb-1 block text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--dim)" }}
        >
          Presupuesto
        </label>
        <input
          type="number"
          value={form.presupuesto}
          onChange={(e) => actualizar("presupuesto", e.target.value)}
          min={0}
          disabled={form.infinito}
          placeholder="Ej: 80"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-40"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--tx)",
          }}
        />
        <label
          className="mt-2 flex items-center gap-2 text-xs"
          style={{ color: "var(--dim)" }}
        >
          <input
            type="checkbox"
            checked={form.infinito}
            onChange={(e) => actualizar("infinito", e.target.checked)}
          />
          Presupuesto infinito (fecha especial)
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending || !puedeGuardar}
        className="w-full rounded-xl py-3 text-sm font-bold transition"
        style={{
          background: guardado
            ? "rgba(242,182,50,0.15)"
            : puedeGuardar
            ? "var(--or)"
            : "rgba(238,90,42,0.4)",
          color: guardado ? "var(--gold)" : "#fff",
          border: guardado ? "1px solid rgba(242,182,50,0.4)" : "none",
          cursor: puedeGuardar && !isPending ? "pointer" : "not-allowed",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {textoBoton}
      </button>
    </form>
  );
}