"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import type { Fila, MiPick } from "./page";
import {
  anotarse,
  darseDeBaja,
  anotarMiembrosSeleccionados,
  quitarInvitado,
  moverAEspera,
  subirAConvocados,
  type ActionResult,
} from "./actions";
import { guardarEquipo } from "./equipo-actions";

type Props = {
  matchId: string;
  cupo: number;
  anotadosCount: number;
  convocados: Fila[];
  noAnotados: Fila[];
  miEstado: string | null;
  isAdmin: boolean;
  bajaClosesIso: string;
  lugar: string | null;
  miEquipo: MiPick[];
  equiposBloqueados: boolean;
  presupuesto: number | null;
};

type Slot = "titular" | "suplente";
type EstadoGuardado = "idle" | "guardando" | "guardado" | "error";

export default function ConvocatoriaClient({
  matchId,
  cupo,
  anotadosCount,
  convocados,
  noAnotados,
  miEstado,
  isAdmin,
  bajaClosesIso,
  lugar,
  miEquipo,
  equiposBloqueados,
  presupuesto,
}: Props) {

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [verUsuarios, setVerUsuarios] = useState(false);
  const [verInvitados, setVerInvitados] = useState(false);
  const [usuariosSel, setUsuariosSel] = useState<Set<string>>(new Set());
  const [invitadosSel, setInvitadosSel] = useState<Set<string>>(new Set());
  const [ajusteSel, setAjusteSel] = useState<Set<string>>(new Set());
  const [esperaSel, setEsperaSel] = useState<Set<string>>(new Set());

  const titularesEsperados = Math.floor(cupo / 2);

  // Separar jugables de los que están en espera
  const jugables = useMemo(
    () =>
      convocados.filter(
        (c) =>
          c.attendance_status === "anotado" ||
          c.attendance_status === "presente"
      ),
    [convocados]
  );
  const enEspera = useMemo(
    () => convocados.filter((c) => c.attendance_status === "lista_espera"),
    [convocados]
  );

  const idsValidos = useMemo(
    () => new Set(jugables.map((c) => c.member_id)),
    [jugables]
  );

  const picksDelServer = useMemo(() => {
    const m = new Map<string, Slot>();
    for (const p of miEquipo) {
      if (idsValidos.has(p.member_id)) {
        m.set(p.member_id, p.slot);
      }
    }
    return m;
  }, [miEquipo, idsValidos]);

  const [picks, setPicks] = useState<Map<string, Slot>>(picksDelServer);
  const [picksGuardados, setPicksGuardados] = useState<Map<string, Slot>>(
    picksDelServer
  );
  const [estadoGuardado, setEstadoGuardado] = useState<EstadoGuardado>("idle");
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const guardadoRecienteRef = useRef<NodeJS.Timeout | null>(null);

  const serverKey = useMemo(() => {
    const arr = Array.from(picksDelServer.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    return JSON.stringify(arr);
  }, [picksDelServer]);

  useEffect(() => {
    setPicks(picksDelServer);
    setPicksGuardados(picksDelServer);
    setEstadoGuardado("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const titulares = useMemo(
    () =>
      Array.from(picks.entries())
        .filter(([, s]) => s === "titular")
        .map(([id]) => id),
    [picks]
  );
  const suplente = useMemo(() => {
    const found = Array.from(picks.entries()).find(([, s]) => s === "suplente");
    return found ? found[0] : null;
  }, [picks]);

  const titularesSet = new Set(titulares);

  const total = useMemo(() => {
    let sum = 0;
    for (const [id] of picks) {
      const c = jugables.find((x) => x.member_id === id);
      sum += c?.valor ?? 0;
    }
    return sum;
  }, [picks, jugables]);

  const equipoCompleto =
    titulares.length === titularesEsperados &&
    (presupuesto === null || total <= presupuesto);

  const hayCambios = useMemo(() => {
    if (picks.size !== picksGuardados.size) return true;
    for (const [k, v] of picks) {
      if (picksGuardados.get(k) !== v) return true;
    }
    return false;
  }, [picks, picksGuardados]);

  // ── AUTOGUARDADO ──
  // Cuando hay cambios, el equipo está completo, y no estamos bloqueados,
  // esperamos 800ms y guardamos solo.
  useEffect(() => {
    if (equiposBloqueados) return;
    if (!equipoCompleto) return;
    if (!hayCambios) return;
    if (estadoGuardado === "guardando") return;

    const timer = setTimeout(async () => {
      setEstadoGuardado("guardando");
      setErrorGuardado(null);

      const arr: MiPick[] = Array.from(picks.entries()).map(
        ([member_id, slot]) => ({ member_id, slot })
      );

      const res = await guardarEquipo(matchId, arr);
      if (res.ok) {
        setPicksGuardados(new Map(picks));
        setEstadoGuardado("guardado");
        if (guardadoRecienteRef.current) clearTimeout(guardadoRecienteRef.current);
        guardadoRecienteRef.current = setTimeout(() => {
          setEstadoGuardado("idle");
        }, 2000);
      } else {
        setEstadoGuardado("error");
        setErrorGuardado(res.error ?? "Error al guardar");
      }
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, equipoCompleto, equiposBloqueados, matchId]);

  function toggleTitular(id: string) {
    if (equiposBloqueados) return;
    setPicks((prev) => {
      const m = new Map(prev);
      if (m.get(id) === "titular") {
        m.delete(id);
      } else {
        let count = 0;
        for (const [, s] of m) if (s === "titular") count++;
        if (count >= titularesEsperados) return prev;
        m.set(id, "titular");
      }
      return m;
    });
  }

  function toggleSuplente(id: string) {
    if (equiposBloqueados) return;
    if (titularesSet.has(id)) return;
    setPicks((prev) => {
      const m = new Map(prev);
      if (m.get(id) === "suplente") {
        m.delete(id);
      } else {
        for (const [k, v] of m) if (v === "suplente") m.delete(k);
        m.set(id, "suplente");
      }
      return m;
    });
  }

  function ejecutarAnotacion(fn: () => Promise<ActionResult>) {
    startTransition(async () => {
      const res = await fn();
      setToast(res.ok ? res.message ?? "Listo" : res.error ?? "Error");
      setTimeout(() => setToast(null), 2500);
      router.refresh();
    });
  }

  // Invitados
  const invitadosAnotados = jugables.filter((c) => c.is_invitado);
  const invitadosNoAnotados = noAnotados.filter((c) => c.is_invitado);
  const todosInvitados = [...invitadosAnotados, ...invitadosNoAnotados];
  const mostrarInvitados = isAdmin && todosInvitados.length > 0;
  const usuariosAnotados = jugables.filter((c) => c.tieneCuenta && !c.is_invitado);
  const usuariosNoAnotados = noAnotados.filter((c) => c.tieneCuenta && !c.is_invitado);
  const todosUsuarios = [...usuariosAnotados, ...usuariosNoAnotados];
  const mostrarUsuarios = isAdmin && todosUsuarios.length > 0;

  const libres = cupo - anotadosCount;
  const seleccionadosCount = invitadosSel.size;
  const puedeSeleccionarMas = seleccionadosCount < libres;

  function toggleInvitado(id: string) {
    setInvitadosSel((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else {
        if (copia.size >= libres) return prev;
        copia.add(id);
      }
      return copia;
    });
  }

  function toggleUsuario(id: string) {
    setUsuariosSel((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else {
        if (copia.size >= libres) return prev;
        copia.add(id);
      }
      return copia;
    });
  }

  function anotarSeleccionados() {
    const ids = Array.from(invitadosSel);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await anotarMiembrosSeleccionados(matchId, ids);
      if (res.ok) {
        setToast(res.message ?? "Invitados anotados");
        setInvitadosSel(new Set());
      } else {
        setToast(res.error ?? "Error");
      }
      setTimeout(() => setToast(null), 2500);
      router.refresh();
    });
  }

  function anotarUsuariosSeleccionados() {
    const ids = Array.from(usuariosSel);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await anotarMiembrosSeleccionados(matchId, ids);
      setToast(res.ok ? res.message ?? "Usuarios anotados" : res.error ?? "Error");
      if (res.ok) setUsuariosSel(new Set());
      setTimeout(() => setToast(null), 2500);
      router.refresh();
    });
  }

  function quitar(memberId: string, alias: string) {
    startTransition(async () => {
      const res = await quitarInvitado(matchId, memberId);
      setToast(res.ok ? `${alias} quitado del partido` : res.error ?? "Error");
      setTimeout(() => setToast(null), 2500);
      router.refresh();
    });
  }

  // Ajuste de desbalance
  const desbalance = anotadosCount - cupo;
  const ajusteCompleto = ajusteSel.size === desbalance;

  function toggleAjuste(id: string) {
    setAjusteSel((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else {
        if (copia.size >= desbalance) return prev;
        copia.add(id);
      }
      return copia;
    });
  }

  function confirmarAjuste() {
    const ids = Array.from(ajusteSel);
    if (ids.length !== desbalance) return;
    startTransition(async () => {
      const res = await moverAEspera(matchId, ids);
      if (res.ok) {
        setToast(res.message ?? "Listo");
        setAjusteSel(new Set());
      } else {
        setToast(res.error ?? "Error");
      }
      setTimeout(() => setToast(null), 2500);
      router.refresh();
    });
  }

  // Subir de espera
  function toggleEspera(id: string) {
    setEsperaSel((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else {
        if (copia.size >= libres) return prev;
        copia.add(id);
      }
      return copia;
    });
  }

  function subirSeleccionados() {
    const ids = Array.from(esperaSel);
    if (ids.length === 0 || ids.length > libres) return;
    startTransition(async () => {
      const res = await subirAConvocados(matchId, ids);
      if (res.ok) {
        setToast(res.message ?? "Listo");
        setEsperaSel(new Set());
      } else {
        setToast(res.error ?? "Error");
      }
      setTimeout(() => setToast(null), 2500);
      router.refresh();
    });
  }

  const completo = anotadosCount >= cupo;
  const bajaCerrada = new Date() > new Date(bajaClosesIso);
  const yoAnotado = miEstado === "anotado" || miEstado === "presente";
  const yoEspera = miEstado === "lista_espera";

  // Texto del indicador de guardado
  let textoEstado = "";
  if (equiposBloqueados) textoEstado = "🔒 Equipos cerrados";
  else if (estadoGuardado === "guardando") textoEstado = "Guardando...";
  else if (estadoGuardado === "guardado") textoEstado = "✓ Guardado";
  else if (estadoGuardado === "error") textoEstado = `⚠ ${errorGuardado}`;
  else if (!equipoCompleto) {
    const faltanTit = titularesEsperados - titulares.length;
    if (faltanTit > 0)
      textoEstado = `Faltan ${faltanTit} titular${faltanTit !== 1 ? "es" : ""}`;
    else if (presupuesto !== null && total > presupuesto)
      textoEstado = "Te pasaste del presupuesto";
  }

  return (
    <div>
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      {/* Alerta: desbalance */}
      {desbalance > 0 && (
        <div
          className="mx-3 mt-3 rounded-2xl p-4"
          style={{
            background: "rgba(226,59,77,0.15)",
            border: "1px solid rgba(226,59,77,0.5)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="min-w-0 flex-1">
              <div className="bebas text-lg tracking-wide" style={{ color: "var(--red)" }}>
                CONVOCATORIA DESBALANCEADA
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--tx)" }}>
                Hay <b>{anotadosCount}</b> anotados pero el cupo es <b>{cupo}</b>.
                {isAdmin
                  ? ` Elegí quién${desbalance !== 1 ? "es" : ""} baja${desbalance !== 1 ? "n" : ""} a lista de espera (${desbalance}).`
                  : " El admin tiene que resolverlo."}
              </p>
            </div>
          </div>

          {isAdmin && (
            <>
              <div className="mt-3">
                {jugables.map((c) => {
                  const sel = ajusteSel.has(c.member_id);
                  const bloqueado = !sel && ajusteSel.size >= desbalance;
                  return (
                    <button
                      key={c.member_id}
                      type="button"
                      onClick={() => toggleAjuste(c.member_id)}
                      disabled={bloqueado}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition"
                      style={{
                        background: sel ? "rgba(226,59,77,0.15)" : "transparent",
                        opacity: bloqueado ? 0.4 : 1,
                        marginTop: 4,
                      }}
                    >
                      <Avatar alias={c.alias} photoUrl={c.photo_url} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.alias}</div>
                      </div>
                      <span
                        className="flex h-5 w-5 flex-none items-center justify-center rounded-md border text-[11px] font-bold transition"
                        style={{
                          borderColor: sel ? "var(--red)" : "rgba(255,255,255,0.25)",
                          background: sel ? "var(--red)" : "transparent",
                          color: sel ? "#fff" : "transparent",
                        }}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={confirmarAjuste}
                disabled={!ajusteCompleto || isPending}
                className="mt-3 w-full rounded-xl py-2 text-xs font-bold transition"
                style={{
                  background: ajusteCompleto ? "var(--red)" : "rgba(226,59,77,0.4)",
                  color: "#fff",
                  cursor: ajusteCompleto && !isPending ? "pointer" : "not-allowed",
                }}
              >
                {isPending
                  ? "Moviendo..."
                  : ajusteCompleto
                  ? `Mover ${desbalance} a lista de espera`
                  : `Elegí ${desbalance - ajusteSel.size} más`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Card del partido */}
      <div
        className="mx-3 mt-3 rounded-2xl p-4"
        style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {lugar && (
          <div className="text-xs" style={{ color: "var(--dim)" }}>
            📍 {lugar}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--dim)" }}>
              Convocados
            </div>
            <div className="bebas text-3xl">
              {anotadosCount} / {cupo}
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: completo ? "rgba(238,90,42,0.2)" : "rgba(242,182,50,0.2)",
              color: completo ? "var(--or)" : "var(--gold)",
            }}
          >
            {completo ? "Completo" : "Abierto"}
          </span>
        </div>
        <div className="my-3 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition"
            style={{
              background: completo ? "var(--or)" : "var(--gold)",
              width: `${Math.min(100, (anotadosCount / cupo) * 100)}%`,
            }}
          />
        </div>
        <div className="text-xs" style={{ color: "var(--dim)" }}>
          {bajaCerrada ? "🔒 Ventana de baja cerrada" : "Bajas sin sanción hasta 3 h antes del partido"}
        </div>
        {!bajaCerrada && (
          <button
            type="button"
            onClick={() =>
              ejecutarAnotacion(() =>
                yoAnotado || yoEspera ? darseDeBaja(matchId) : anotarse(matchId)
              )
            }
            disabled={isPending}
            className="mt-3 w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-50"
            style={{
              background: yoAnotado || yoEspera ? "transparent" : "var(--or)",
              color: yoAnotado || yoEspera ? "var(--gold)" : "#fff",
              border: yoAnotado || yoEspera ? "1px solid var(--gold)" : "none",
            }}
          >
            {isPending
              ? "..."
              : yoAnotado
              ? "✓ Estás anotado · Darme de baja"
              : yoEspera
              ? "En lista de espera · Salir"
              : completo
              ? "Anotarme en lista de espera"
              : "Anotarme"}
          </button>
        )}
      </div>

      {/* Aviso: faltan titulares */}
      {!equipoCompleto && titulares.length < titularesEsperados && !equiposBloqueados && (
        <div
          className="mx-3 mt-3 rounded-2xl p-4"
          style={{
            background: "rgba(242,182,50,0.15)",
            border: "2px solid var(--gold)",
            animation: "highlightPulse 2.5s ease-in-out infinite",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">👥</span>
            <div className="min-w-0 flex-1">
              <div
                className="bebas text-lg tracking-wider"
                style={{ color: "var(--gold)" }}
              >
                FALTAN TITULARES
              </div>
              <p className="mt-1 text-xs font-bold" style={{ color: "var(--tx)" }}>
                Elegiste <b>{titulares.length}</b> de <b>{titularesEsperados}</b>{" "}
                titulares.
                {titularesEsperados - titulares.length === 1
                  ? " Te falta 1 más para guardar."
                  : ` Te faltan ${titularesEsperados - titulares.length} más para guardar.`}
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Aviso: te pasaste del presupuesto */}
      {presupuesto !== null && total > presupuesto && !equiposBloqueados && (
        <div
          className="mx-3 mt-3 rounded-2xl p-4"
          style={{
            background: "rgba(226,59,77,0.2)",
            border: "2px solid var(--red)",
            animation: "highlightPulse 1.8s ease-in-out infinite",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <div className="min-w-0 flex-1">
              <div
                className="bebas text-lg tracking-wider"
                style={{ color: "var(--red)" }}
              >
                TE PASASTE DEL PRESUPUESTO
              </div>
              <p className="mt-1 text-xs font-bold" style={{ color: "var(--tx)" }}>
                Gastaste <b>{total}</b> pero el máximo es <b>{presupuesto}</b>.
                Sacá <b>{total - presupuesto}</b> de valor para poder guardar.
              </p>
            </div>
          </div>
        </div>
      )}




      {/* Barra MI EQUIPO */}
            
      <div
        id="onboarding-mi-equipo"
        className="sticky top-0 z-30 mx-3 mt-3 rounded-2xl px-4 py-3"
        style={{
          background: "rgba(17,53,42,0.96)",
          border: `1px solid ${
            estadoGuardado === "guardado"
              ? "rgba(242,182,50,0.6)"
              : estadoGuardado === "error"
              ? "rgba(226,59,77,0.5)"
              : "rgba(255,255,255,0.08)"
          }`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transition: "border-color 0.3s",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="bebas text-base tracking-wider">
              MI EQUIPO
            </div>
            <div className="text-[11px]" style={{ color: "var(--dim)" }}>
              T {titulares.length}/{titularesEsperados} · S {suplente ? 1 : 0}/1 ·{" "}
                           {presupuesto === null ? (
                <span style={{ color: "var(--gold)" }}>∞</span>
              ) : (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{
                    background:
                      total > presupuesto
                        ? "rgba(226,59,77,0.25)"
                        : "rgba(242,182,50,0.15)",
                    color: total > presupuesto ? "var(--red)" : "var(--gold)",
                    fontWeight: 700,
                  }}
                >
                  {total > presupuesto && "⚠ "}
                  {total}/{presupuesto}
                </span>
              )}
            </div>
          </div>
          {textoEstado && (
            <div
              className="flex-none rounded-xl px-3 py-2 text-xs font-bold transition"
              style={{
                background:
                  estadoGuardado === "guardado"
                    ? "rgba(242,182,50,0.2)"
                    : estadoGuardado === "error"
                    ? "rgba(226,59,77,0.2)"
                    : "rgba(255,255,255,0.05)",
                color:
                  estadoGuardado === "guardado"
                    ? "var(--gold)"
                    : estadoGuardado === "error"
                    ? "var(--red)"
                    : "var(--dim)",
              }}
            >
              {textoEstado}
            </div>
          )}
        </div>
      </div>

      {/* Lista de convocados (jugables) */}
      <div
        id="onboarding-convocados"
        className="bebas mt-4 px-4 text-xl tracking-wider"
      >
        CONVOCADOS ({jugables.length})
      </div>
      <div className="mt-1">
        {jugables.map((c) => (
          <FilaConvocado
            key={c.member_id}
            c={c}
            esTitular={titularesSet.has(c.member_id)}
            esSuplente={suplente === c.member_id}
            onToggleTitular={() => toggleTitular(c.member_id)}
            onToggleSuplente={() => toggleSuplente(c.member_id)}
            bloqueado={equiposBloqueados}
          />
        ))}
        {jugables.length === 0 && (
          <p className="px-4 py-3 text-xs" style={{ color: "var(--dim)" }}>
            Nadie se anotó todavía. ¡Sé el primero!
          </p>
        )}
      </div>

      {/* Lista de espera */}
      {enEspera.length > 0 && (
        <>
          <div className="bebas mt-5 px-4 text-xl tracking-wider">
            EN ESPERA ({enEspera.length})
          </div>
          <p className="px-4 text-[11px]" style={{ color: "var(--dim)" }}>
            {isAdmin
              ? `Podés subirlos a convocados si hay lugar (${libres} libre${libres !== 1 ? "s" : ""}).`
              : "Entran automáticamente si alguien se da de baja."}
          </p>
          <div className="mt-1">
            {enEspera.map((c) => (
              <FilaEspera
                key={c.member_id}
                c={c}
                isAdmin={isAdmin}
                hayLugar={libres > 0}
                seleccionado={esperaSel.has(c.member_id)}
                onToggle={() => toggleEspera(c.member_id)}
              />
            ))}
          </div>
          {isAdmin && esperaSel.size > 0 && (
            <div className="mx-3 mt-2">
              <button
                type="button"
                onClick={subirSeleccionados}
                disabled={isPending || esperaSel.size > libres}
                className="w-full rounded-xl py-2 text-xs font-bold transition"
                style={{
                  background:
                    esperaSel.size > libres ? "rgba(238,90,42,0.4)" : "var(--or)",
                  color: "#fff",
                  cursor: esperaSel.size > libres ? "not-allowed" : "pointer",
                }}
              >
                {isPending
                  ? "Subiendo..."
                  : esperaSel.size > libres
                  ? `Solo hay ${libres} lugar${libres !== 1 ? "es" : ""}`
                  : `Subir ${esperaSel.size} a convocados`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Usuarios con cuenta, que el admin puede anotar */}
      {mostrarUsuarios && (
        <>
          <button
            type="button"
            onClick={() => setVerUsuarios((v) => !v)}
            className="mt-5 flex w-full items-center gap-2 px-4 py-2 text-left"
          >
            <span className="bebas text-xl tracking-wider">
              USUARIOS ({todosUsuarios.length})
            </span>
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--or)", color: "#fff" }}>
              ADMIN
            </span>
            <span className="text-xs transition" style={{ color: "var(--dim)", transform: verUsuarios ? "rotate(180deg)" : "rotate(0)" }}>
              ▼
            </span>
          </button>

          {verUsuarios && (
            <div className="mx-3 mt-1 overflow-hidden rounded-2xl" style={{ background: "var(--g1)" }}>
              <div className="px-4 py-3 text-[11px]" style={{ color: "var(--dim)" }}>
                Seleccioná usuarios con cuenta para anotarlos ({libres} lugar{libres !== 1 ? "es" : ""} libre{libres !== 1 ? "s" : ""}).
              </div>
              {usuariosNoAnotados.length > 0 ? (
                <>
                  {usuariosNoAnotados.map((c) => {
                    const sel = usuariosSel.has(c.member_id);
                    const bloqueado = libres <= 0 || (!sel && usuariosSel.size >= libres);
                    return (
                      <button
                        key={c.member_id}
                        type="button"
                        onClick={() => toggleUsuario(c.member_id)}
                        disabled={bloqueado || isPending}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left transition"
                        style={{ background: sel ? "rgba(242,182,50,0.1)" : "transparent", borderTop: "1px solid rgba(255,255,255,0.04)", opacity: bloqueado && !sel ? 0.4 : 1 }}
                      >
                        <Avatar alias={c.alias} photoUrl={c.photo_url} size={32} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.alias}</span>
                        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md border text-[11px] font-bold" style={{ borderColor: sel ? "var(--gold)" : "rgba(255,255,255,0.25)", background: sel ? "var(--gold)" : "transparent", color: sel ? "#12261c" : "transparent" }}>
                          ✓
                        </span>
                      </button>
                    );
                  })}
                  <div className="p-3">
                    <button
                      type="button"
                      onClick={anotarUsuariosSeleccionados}
                      disabled={usuariosSel.size === 0 || isPending}
                      className="w-full rounded-xl py-2 text-sm font-bold transition disabled:opacity-40"
                      style={{ background: "var(--or)", color: "#fff" }}
                    >
                      {isPending ? "Anotando..." : `Anotar ${usuariosSel.size} usuario${usuariosSel.size !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-4 pb-4 text-[11px]" style={{ color: "var(--dim)" }}>
                  Todos los usuarios disponibles ya están anotados o en espera.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Invitados */}
      {mostrarInvitados && (
        <>
          <button
            type="button"
            onClick={() => setVerInvitados((v) => !v)}
            className="mt-5 flex w-full items-center gap-2 px-4 py-2 text-left"
          >
            <span className="bebas text-xl tracking-wider">
              INVITADOS ({todosInvitados.length})
            </span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              ADMIN
            </span>
            <span
              className="text-xs transition"
              style={{
                color: "var(--dim)",
                transform: verInvitados ? "rotate(180deg)" : "rotate(0)",
              }}
            >
              ▼
            </span>
          </button>

          {verInvitados && (
            <div className="mx-3 mt-1 overflow-hidden rounded-2xl" style={{ background: "var(--g1)" }}>
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px]" style={{ color: "var(--dim)" }}>
                    Anotá invitados o quitá los que ya están
                  </div>
                  <div
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: libres <= 0 ? "rgba(238,90,42,0.2)" : "rgba(242,182,50,0.15)",
                      color: libres <= 0 ? "var(--or)" : "var(--gold)",
                    }}
                  >
                    {libres <= 0 ? "Cupo completo" : `${libres} libre${libres !== 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>

              {invitadosAnotados.length > 0 && (
                <>
                  <div
                    className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--dim)" }}
                  >
                    Ya anotados
                  </div>
                  {invitadosAnotados.map((c) => (
                    <div
                      key={c.member_id}
                      className="flex items-center gap-3 px-4 py-2"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <Avatar alias={c.alias} photoUrl={c.photo_url} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.alias}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitar(c.member_id, c.alias)}
                        disabled={isPending}
                        className="rounded-lg border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50"
                        style={{ borderColor: "var(--red)", color: "var(--red)" }}
                      >
                        ✕ Quitar
                      </button>
                    </div>
                  ))}
                </>
              )}

              {invitadosNoAnotados.length > 0 && (
                <>
                  {invitadosAnotados.length > 0 && (
                    <div
                      className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--dim)" }}
                    >
                      Disponibles
                    </div>
                  )}
                  {invitadosNoAnotados.map((c) => {
                    const sel = invitadosSel.has(c.member_id);
                    const bloqueado = libres <= 0 || (!sel && !puedeSeleccionarMas);
                    return (
                      <button
                        key={c.member_id}
                        type="button"
                        onClick={() => toggleInvitado(c.member_id)}
                        disabled={bloqueado}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left transition"
                        style={{
                          background: sel ? "rgba(242,182,50,0.1)" : "transparent",
                          borderTop: "1px solid rgba(255,255,255,0.04)",
                          opacity: bloqueado && !sel ? 0.4 : 1,
                        }}
                      >
                        <Avatar alias={c.alias} photoUrl={c.photo_url} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{c.alias}</div>
                        </div>
                        <span
                          className="flex h-5 w-5 flex-none items-center justify-center rounded-md border text-[11px] font-bold transition"
                          style={{
                            borderColor: sel ? "var(--gold)" : "rgba(255,255,255,0.25)",
                            background: sel ? "var(--gold)" : "transparent",
                            color: sel ? "#12261c" : "transparent",
                          }}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {invitadosNoAnotados.length === 0 && (
                <div className="px-4 py-3 text-[11px]" style={{ color: "var(--dim)" }}>
                  Todos los invitados ya están anotados.
                </div>
              )}

              {invitadosNoAnotados.length > 0 && (
                <div className="p-3">
                  <button
                    type="button"
                    onClick={anotarSeleccionados}
                    disabled={seleccionadosCount === 0 || isPending}
                    className="w-full rounded-xl py-2 text-sm font-bold transition"
                    style={{
                      background:
                        seleccionadosCount === 0 || isPending
                          ? "rgba(238,90,42,0.4)"
                          : "var(--or)",
                      color: "#fff",
                      cursor:
                        seleccionadosCount === 0 || isPending ? "not-allowed" : "pointer",
                    }}
                  >
                    {isPending
                      ? "Anotando..."
                      : seleccionadosCount === 0
                      ? "Elegí al menos uno"
                      : `Anotar ${seleccionadosCount} invitado${seleccionadosCount !== 1 ? "s" : ""}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}

function FilaConvocado({
  c,
  esTitular,
  esSuplente,
  onToggleTitular,
  onToggleSuplente,
  bloqueado,
}: {
  c: Fila;
  esTitular: boolean;
  esSuplente: boolean;
  onToggleTitular: () => void;
  onToggleSuplente: () => void;
  bloqueado: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: c.is_me
          ? "linear-gradient(90deg, rgba(242,182,50,0.15), transparent)"
          : undefined,
      }}
    >
      <Avatar alias={c.alias} photoUrl={c.photo_url} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{c.alias}</span>
          {c.is_me && (
            <span className="text-[10px]" style={{ color: "var(--gold)" }}>
              · vos
            </span>
          )}
          {c.is_invitado && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              INV
            </span>
          )}
        </div>
         <div className="text-[11px]" style={{ color: "var(--gold)" }}>
          Valor de mercado: <b>{c.valor}</b>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleTitular}
        disabled={bloqueado}
        className="h-7 w-7 flex-none rounded-lg border text-xs font-bold transition"
        style={{
          background: esTitular ? "var(--or)" : "transparent",
          borderColor: esTitular ? "var(--or)" : "rgba(255,255,255,0.2)",
          color: esTitular ? "#fff" : "var(--dim)",
          opacity: bloqueado ? 0.5 : 1,
        }}
      >
        T
      </button>
      <button
        type="button"
        onClick={onToggleSuplente}
        disabled={bloqueado || esTitular}
        className="h-7 w-7 flex-none rounded-lg border text-xs font-bold transition"
        style={{
          background: esSuplente ? "var(--gold)" : "transparent",
          borderColor: esSuplente ? "var(--gold)" : "rgba(255,255,255,0.2)",
          color: esSuplente ? "#12261c" : "var(--dim)",
          opacity: bloqueado || esTitular ? 0.3 : 1,
        }}
      >
        S
      </button>
    </div>
  );
}

function FilaEspera({
  c,
  isAdmin,
  hayLugar,
  seleccionado,
  onToggle,
}: {
  c: Fila;
  isAdmin: boolean;
  hayLugar: boolean;
  seleccionado: boolean;
  onToggle: () => void;
}) {
  const puedeSeleccionar = isAdmin && hayLugar;

  return (
    <button
      type="button"
      onClick={puedeSeleccionar ? onToggle : undefined}
      disabled={!puedeSeleccionar}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: seleccionado ? "rgba(242,182,50,0.1)" : "transparent",
        cursor: puedeSeleccionar ? "pointer" : "default",
      }}
    >
      <Avatar alias={c.alias} photoUrl={c.photo_url} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold" style={{ color: "var(--dim)" }}>
            {c.alias}
          </span>
          {c.is_me && (
            <span className="text-[10px]" style={{ color: "var(--gold)" }}>
              · vos
            </span>
          )}
          {c.is_invitado && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              INV
            </span>
          )}
        </div>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={{ background: "rgba(255,255,255,0.1)", color: "var(--dim)" }}
      >
        EN ESPERA
      </span>
      {puedeSeleccionar && (
        <span
          className="flex h-5 w-5 flex-none items-center justify-center rounded-md border text-[11px] font-bold transition"
          style={{
            borderColor: seleccionado ? "var(--gold)" : "rgba(255,255,255,0.25)",
            background: seleccionado ? "var(--gold)" : "transparent",
            color: seleccionado ? "#12261c" : "transparent",
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}
