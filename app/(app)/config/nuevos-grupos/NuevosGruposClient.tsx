"use client";

import { useState, useTransition } from "react";
import { crearInvitacionAdminGrupo } from "./actions";

export default function NuevosGruposClient() {
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function crear() {
    setMensaje(null);
    setEnlace(null);
    startTransition(async () => {
      const result = await crearInvitacionAdminGrupo();
      if (!result.ok || !result.token) {
        setMensaje(result.error ?? "No se pudo crear el enlace");
        return;
      }
      setEnlace(`${window.location.origin}/crear-grupo-admin/${result.token}`);
    });
  }

  async function copiarEnlace() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setMensaje("No se pudo copiar. Podés seleccionar y copiar el enlace manualmente.");
    }
  }

  return (
    <div className="mx-3 mt-3 space-y-4">
      <section
        className="rounded-2xl p-4"
        style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm" style={{ color: "var(--tx)" }}>
          Generá un enlace para la persona que va a administrar el grupo. Esa persona elegirá el nombre al crear su cuenta.
        </p>
        <p className="mt-2 text-[11px]" style={{ color: "var(--dim)" }}>
          El enlace vence en 14 días y sirve para crear una sola cuenta de admin.
        </p>
        <button
          type="button"
          onClick={crear}
          disabled={isPending}
          className="mt-4 w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-50"
          style={{ background: "var(--or)", color: "#fff" }}
        >
          {isPending ? "Creando enlace..." : "Crear enlace para el admin"}
        </button>
      </section>

      {enlace && (
        <section
          className="rounded-2xl p-4"
          style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="text-sm font-bold" style={{ color: "var(--gold)" }}>
            Enlace listo para compartir
          </div>
          <button
            type="button"
            onClick={copiarEnlace}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="flex-1 break-all text-[11px]" style={{ color: "var(--gold)", fontFamily: "monospace" }}>
              {enlace}
            </span>
            <span className="flex-none text-[11px] font-bold" style={{ color: "var(--dim)" }}>
              {copiado ? "✓ Copiado" : "📋 Copiar"}
            </span>
          </button>
          <p className="mt-2 text-[11px]" style={{ color: "var(--dim)" }}>
            Mandáselo a la persona que va a administrar este grupo. Después de crear su cuenta, podrá copiar desde Configuración el enlace para invitar a sus amigos.
          </p>
        </section>
      )}

      {mensaje && (
        <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(226,59,77,0.15)", color: "#ffc1c9" }}>
          {mensaje}
        </div>
      )}
    </div>
  );
}
