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
  vincularSolicitudConHistorial,
  agregarInvitado,
  type ActionResult,
} from "./actions";

export default function PlantelClient({ miembros }: { miembros: Miembro[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [cuentasSeleccionadas, setCuentasSeleccionadas] = useState<
    Record<string, string>
  >({});
  const [historialPorSolicitud, setHistorialPorSolicitud] = useState<
    Record<string, string>
  >({});

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
  const pendientesVinculables = pendientes.filter((m) => m.user_id !== null);
  const historialesVinculables = miembros.filter(
    (m) => m.status === "baja" || (m.status === "invitado" && m.user_id === null)
  );

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
          <p className="px-4 pb-2 text-xs" style={{ color: "var(--dim)" }}>
            Si la persona ya jugaba como invitada, confirmá su identidad por un
            canal conocido y vinculá su historial al aprobarla.
          </p>
          {pendientes.map((m) => {
            const historialId = historialPorSolicitud[m.id] ?? "";
            return (
              <div key={m.id}>
                <FilaMiembro m={m}>
                  <BotonMini
                    onClick={() =>
                      ejecutar(() => aprobarMiembro(m.id), () => router.refresh())
                    }
                    disabled={isPending || !!historialId}
                    color="var(--gold)"
                    texto={historialId ? "Vinculá el historial elegido" : "Aprobar"}
                  />
                  <BotonMini
                    onClick={() =>
                      ejecutar(() => rechazarPendiente(m.id), () => router.refresh())
                    }
                    disabled={isPending}
                    color="var(--red)"
                    texto="Rechazar"
                  />
                </FilaMiembro>
                {historialesVinculables.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="flex gap-2">
                      <select
                        value={historialId}
                        onChange={(event) =>
                          setHistorialPorSolicitud((prev) => ({
                            ...prev,
                            [m.id]: event.target.value,
                          }))
                        }
                        disabled={isPending}
                        aria-label={`Historial anterior de ${m.display_name}`}
                        className="min-w-0 flex-1 rounded-lg px-2 py-2 text-xs"
                        style={{
                          background: "var(--g2)",
                          color: "var(--tx)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <option value="">Es nuevo en el grupo</option>
                        {historialesVinculables.map((anterior) => (
                          <option key={anterior.id} value={anterior.id}>
                            {anterior.display_name} ·{" "}
                            {anterior.status === "invitado" ? "invitado" : "archivado"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isPending || !historialId}
                        onClick={() =>
                          ejecutar(
                            () =>
                              vincularSolicitudConHistorial(historialId, m.id),
                            () => {
                              setHistorialPorSolicitud((prev) => {
                                const next = { ...prev };
                                delete next[m.id];
                                return next;
                              });
                              router.refresh();
                            }
                          )
                        }
                        className="rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40"
                        style={{ background: "var(--or)", color: "#fff" }}
                      >
                        Aprobar y vincular
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
                ejecutar(() => suspenderMiembro(m.id), () => router.refresh())
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
                  ejecutar(() => darDeBaja(m.id), () => router.refresh())
                }
                disabled={isPending}
                color="var(--red)"
                texto="Archivar"
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
                  ejecutar(() => rehabilitarMiembro(m.id), () => router.refresh())
                }
                disabled={isPending}
                color="var(--gold)"
                texto="Rehabilitar"
              />
              <BotonMini
                onClick={() =>
                  ejecutar(() => darDeBaja(m.id), () => router.refresh())
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
        <Seccion titulo={`📁 Archivados (${bajas.length})`} abierta={false}>
          <p className="px-4 pb-2 text-xs" style={{ color: "var(--dim)" }}>
            Se conservan sus equipos, puntos y demás historial. Si vuelve con
            otra cuenta, vinculá acá su solicitud pendiente.
          </p>
          {bajas.map((m) => {
            const cuentaSeleccionada = cuentasSeleccionadas[m.id] ?? "";
            return (
              <div key={m.id}>
                <FilaMiembro m={m}>
                  <BotonMini
                    onClick={() =>
                      ejecutar(() => rehabilitarMiembro(m.id), () => router.refresh())
                    }
                    disabled={isPending}
                    color="var(--gold)"
                    texto="Reactivar"
                  />
                </FilaMiembro>
                {pendientesVinculables.length > 0 && (
                  <div className="flex gap-2 px-4 pb-3">
                    <select
                      value={cuentaSeleccionada}
                      onChange={(event) =>
                        setCuentasSeleccionadas((prev) => ({
                          ...prev,
                          [m.id]: event.target.value,
                        }))
                      }
                      disabled={isPending}
                      aria-label={`Cuenta pendiente para vincular con ${m.display_name}`}
                      className="min-w-0 flex-1 rounded-lg px-2 py-2 text-xs"
                      style={{
                        background: "var(--g2)",
                        color: "var(--tx)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <option value="">Elegí una solicitud pendiente</option>
                      {pendientesVinculables.map((pendiente) => (
                        <option key={pendiente.id} value={pendiente.id}>
                          {pendiente.display_name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isPending || !cuentaSeleccionada}
                      onClick={() =>
                        ejecutar(
                          () =>
                            vincularSolicitudConHistorial(m.id, cuentaSeleccionada),
                          () => {
                            setCuentasSeleccionadas((prev) => {
                              const next = { ...prev };
                              delete next[m.id];
                              return next;
                            });
                            router.refresh();
                          }
                        )
                      }
                      className="rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40"
                      style={{ background: "var(--or)", color: "#fff" }}
                    >
                      Vincular
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
        {m.market_value !== null && (
          <div className="text-xs font-semibold" style={{ color: "var(--gold)" }}>
            Valor de mercado: ${m.market_value.toLocaleString("es-AR")}
          </div>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">{children}</div>
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
