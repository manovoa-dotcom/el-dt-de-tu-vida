"use client";

import { useState, useTransition } from "react";
import { avisarEquiposPendientes } from "./actions";

type MiembroArmado = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  armo: boolean;
};

export default function EquiposArmadosSeleccion({
  armado,
  matchId,
}: {
  armado: MiembroArmado[];
  matchId: string;
}) {
  const pendientes = armado.filter((miembro) => !miembro.armo);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const listos = armado.filter((miembro) => miembro.armo).length;
  const faltan = armado.length - listos;
  const porcentaje = armado.length > 0 ? (listos / armado.length) * 100 : 0;

  function seleccionarPendientes() {
    setSeleccionados((actuales) =>
      actuales.length === pendientes.length
        ? []
        : pendientes.map((miembro) => miembro.member_id)
    );
  }

  function enviarAviso() {
    startTransition(async () => {
      const resultado = await avisarEquiposPendientes(matchId, seleccionados);
      setMensaje(resultado.ok ? resultado.message ?? "Aviso enviado" : resultado.error ?? "Error al enviar");
      if (resultado.ok) setSeleccionados([]);
      setTimeout(() => setMensaje(null), 3500);
    });
  }

  return (
    <div className="mx-3 mt-5">
      {mensaje && (
        <div role="status" className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl" style={{ background: "var(--gold)", color: "#12261c" }}>
          {mensaje}
        </div>
      )}

      <div className="bebas px-1 text-lg tracking-wider">ARMADO DE EQUIPOS</div>
      <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
        Quién ya armó su equipo para esta fecha (no se ve el contenido)
      </p>

      <div className="mt-2 rounded-2xl p-4" style={{ background: "var(--g1)", border: `1px solid ${faltan === 0 ? "rgba(242,182,50,0.5)" : "rgba(255,255,255,0.06)"}` }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--dim)" }}>DTs con equipo armado</div>
            <div className="bebas text-3xl">{listos} / {armado.length}</div>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: faltan === 0 ? "rgba(242,182,50,0.2)" : "rgba(238,90,42,0.2)", color: faltan === 0 ? "var(--gold)" : "var(--or)" }}>
            {faltan === 0 ? "✓ Todos listos" : `Faltan ${faltan}`}
          </span>
        </div>

        <div className="mt-3 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div className="h-full rounded-full transition-all" style={{ background: faltan === 0 ? "var(--gold)" : "var(--or)", width: `${porcentaje}%` }} />
        </div>

        {pendientes.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "var(--dim)" }}>Seleccioná a quiénes recordarles que armen su equipo.</p>
            <button type="button" onClick={seleccionarPendientes} className="shrink-0 text-xs font-bold" style={{ color: "var(--gold)" }}>
              {seleccionados.length === pendientes.length ? "Ninguno" : "Todos los pendientes"}
            </button>
          </div>
        )}

        <div className="mt-2 space-y-1">
          {armado.map((miembro) => (
            <label key={miembro.member_id} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: miembro.armo ? "rgba(242,182,50,0.08)" : "rgba(255,255,255,0.02)" }}>
              {miembro.armo ? (
                <span aria-label="Equipo armado" className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "var(--gold)", color: "#12261c" }}>✓</span>
              ) : (
                <input type="checkbox" checked={seleccionados.includes(miembro.member_id)} onChange={() => setSeleccionados((actuales) => actuales.includes(miembro.member_id) ? actuales.filter((id) => id !== miembro.member_id) : [...actuales, miembro.member_id])} aria-label={`Seleccionar a ${miembro.alias} para recordatorio`} className="h-5 w-5 flex-none accent-amber-400" />
              )}
              <span className="flex-1 truncate text-sm" style={{ color: miembro.armo ? "var(--tx)" : "var(--dim)", fontWeight: miembro.armo ? 600 : 400 }}>{miembro.alias}</span>
              {miembro.armo && <span className="text-[10px]" style={{ color: "var(--gold)" }}>Listo</span>}
            </label>
          ))}
        </div>

        {pendientes.length > 0 && (
          <button type="button" onClick={enviarAviso} disabled={seleccionados.length === 0 || isPending} className="mt-4 w-full rounded-xl py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "var(--or)", color: "#fff" }}>
            {isPending ? "Enviando..." : `🔔 Enviar recordatorio${seleccionados.length ? ` a ${seleccionados.length}` : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}
