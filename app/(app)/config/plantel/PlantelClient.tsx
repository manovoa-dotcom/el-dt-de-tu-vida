

"use client";

import Avatar from "@/components/Avatar";
import { useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import type { Miembro } from "./page";
import {
  aprobarMiembro,
  rechazarPendiente,
  suspenderMiembro,
  rehabilitarMiembro,
  darDeBaja,
  agregarInvitado,
  type ActionResult,
} from "./actions";

export default function PlantelClient({ miembros }: { miembros: Miembro[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function ejecutar(
    fn: () => Promise<ActionResult>,
    onOk: () => void
  ) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setToast(res.error ?? "Error");
      } else {
        setToast(res.message ?? "Listo");
        onOk();
      }
      setTimeout(() => setToast(null), 2500);
    });
  }

  const pendientes = miembros.filter((m) => m.status === "pendiente");
  const activos = miembros.filter((m) => m.status === "activo" && m.role !== "admin");
  const admins = miembros.filter((m) => m.status === "activo" && m.role === "admin");
  const suspendidos = miembros.filter((m) => m.status === "suspendido");
  const invitados = miembros.filter((m) => m.status === "invitado");
  const bajas = miembros.filter((m) => m.status === "baja");

  return (
    <div className="mt-2">
      {toast && (
        <div
          className="mx-3 mt-2 rounded-xl px-3 py-2 text-sm"
          style={{ background: "rgba(242,182,50,0.15)", color: "var(--gold)" }}
        >
          {toast}
        </div>
      )}

      {/* AGREGAR INVITADO */}
      <Seccion titulo="Agregar invitado" abierta={false}>
        <FormInvitado />
      </Seccion>

      {/* PENDIENTES */}
      {pendientes.length > 0 && (
        <Seccion titulo={`⏳ Pendientes (${pendientes.length})`} abierta={true}>
          {pendientes.map((m) => (
            <FilaMiembro key={m.id} m={m}>
              <BotonMini
                onClick={() =>
                  ejecutar(
                    () => aprobarMiembro(m.id),
                    () => router.refresh()
                  )
                }
                disabled={isPending}
                color="var(--gold)"
                texto="Aprobar"
              />
              <BotonMini
                onClick={() =>
                  ejecutar(
                    () => rechazarPendiente(m.id),
                    () => router.refresh()
                  )
                }
                disabled={isPending}
                color="var(--red)"
                texto="Rechazar"
              />
            </FilaMiembro>
          ))}
        </Seccion>
      )}

      {/* ADMINS */}
      <Seccion titulo={`👑 Admins (${admins.length})`} abierta={true}>
        {admins.map((m) => (
          <FilaMiembro key={m.id} m={m}>
            <span className="text-xs" style={{ color: "var(--dim)" }}>
              Admin
            </span>
          </FilaMiembro>
        ))}
      </Seccion>

      {/* ACTIVOS */}
      <Seccion titulo={`⚽ Activos (${activos.length})`} abierta={true}>
        {activos.map((m) => (
          <FilaMiembro key={m.id} m={m}>
            <BotonMini
              onClick={() =>
                ejecutar(
                  () => suspenderMiembro(m.id),
                  () => router.refresh()
                )
              }
              disabled={isPending}
              color="var(--dim)"
              texto="Suspender"
            />
          </FilaMiembro>
        ))}
        {activos.length === 0 && (
          <p className="px-4 py-3 text-xs" style={{ color: "var(--dim)" }}>
            No hay otros activos todavía.
          </p>
        )}
      </Seccion>

      {/* INVITADOS */}
      {invitados.length > 0 && (
        <Seccion titulo={`🎫 Invitados (${invitados.length})`} abierta={false}>
          {invitados.map((m) => (
            <FilaMiembro key={m.id} m={m}>
              <BotonMini
                onClick={() =>
                  ejecutar(
                    () => darDeBaja(m.id),
                    () => router.refresh()
                  )
                }
                disabled={isPending}
                color="var(--red)"
                texto="Eliminar"
              />
            </FilaMiembro>
          ))}
        </Seccion>
      )}

      {/* SUSPENDIDOS */}
      {suspendidos.length > 0 && (
        <Seccion titulo={`🚫 Suspendidos (${suspendidos.length})`} abierta={false}>
          {suspendidos.map((m) => (
            <FilaMiembro key={m.id} m={m}>
              <BotonMini
                onClick={() =>
                  ejecutar(
                    () => rehabilitarMiembro(m.id),
                    () => router.refresh()
                  )
                }
                disabled={isPending}
                color="var(--gold)"
                texto="Rehabilitar"
              />
              <BotonMini
                onClick={() =>
                  ejecutar(
                    () => darDeBaja(m.id),
                    () => router.refresh()
                  )
                }
                disabled={isPending}
                color="var(--red)"
                texto="Baja"
              />
            </FilaMiembro>
          ))}
        </Seccion>
      )}

      {/* BAJAS */}
      {bajas.length > 0 && (
        <Seccion titulo={`📁 Bajas (${bajas.length})`} abierta={false}>
          {bajas.map((m) => (
            <FilaMiembro key={m.id} m={m}>
              <span className="text-xs" style={{ color: "var(--dim)" }}>
                Archivado
              </span>
            </FilaMiembro>
          ))}
        </Seccion>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────────────────────

function Seccion({
  titulo,
  abierta,
  children,
}: {
  titulo: string;
  abierta: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(abierta);
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left"
        style={{ color: "var(--tx)" }}
      >
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="text-xs" style={{ color: "var(--dim)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function FilaMiembro({
  m,
  children,
}: {
  m: Miembro;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <Avatar alias={m.display_name} photoUrl={m.photo_url} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{m.display_name}</div>
        {m.real_name && (
          <div className="truncate text-xs" style={{ color: "var(--dim)" }}>
            {m.real_name}
          </div>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">{children}</div>
    </div>
  );
}

function AvatarLetra({ alias }: { alias: string }) {
  const inicial = alias.trim().charAt(0).toUpperCase();
  return (
    <div
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold"
      style={{
        background: "rgba(255,255,255,0.08)",
        color: "var(--gold)",
      }}
    >
      {inicial}
    </div>
  );
}

function BotonMini({
  onClick,
  disabled,
  color,
  texto,
}: {
  onClick: () => void;
  disabled?: boolean;
  color: string;
  texto: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border px-3 py-1 text-xs font-medium transition disabled:opacity-50"
      style={{ borderColor: color, color }}
    >
      {texto}
    </button>
  );
}

function FormInvitado() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    agregarInvitado,
    { ok: true }
  );

  return (
    <form action={formAction} className="px-4 py-3">
      <div className="flex gap-2">
        <input
          type="text"
          name="alias"
          required
          maxLength={30}
          placeholder="Alias del invitado"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--tx)",
          }}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl px-4 py-2 text-sm font-bold transition disabled:opacity-50"
          style={{ background: "var(--or)", color: "#fff" }}
        >
          {pending ? "..." : "Agregar"}
        </button>
      </div>
      {state && !state.ok && state.error && (
        <p className="mt-2 text-xs" style={{ color: "#ff8a95" }}>
          {state.error}
        </p>
      )}
      {state && state.ok && state.message && (
        <p className="mt-2 text-xs" style={{ color: "var(--gold)" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
