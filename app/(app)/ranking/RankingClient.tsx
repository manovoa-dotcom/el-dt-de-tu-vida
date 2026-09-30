"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import Carta from "@/components/Carta";
import CanchaEquipo from "@/components/CanchaEquipo";
import type {
  DTRanking,
  JugadorRanking,
  ItemInfo,
  EquipoDTFecha,
  ResultadoFechaJugador,
} from "./page";

type Props = {
  rankingDT: DTRanking[];
  rankingJugadores: JugadorRanking[];
  equipoIdealAnio: JugadorRanking[];
  dtDelAnio: DTRanking | null;
  items: ItemInfo[];
};

type Tab = "dt" | "jugadores";

export default function RankingClient({
  rankingDT,
  rankingJugadores,
  equipoIdealAnio,
  dtDelAnio,
  items,
}: Props) {
  const [tab, setTab] = useState<Tab>("dt");
  const [fichaDT, setFichaDT] = useState<string | null>(null);
  const [fichaJugador, setFichaJugador] = useState<string | null>(null);
  const [filtroItem, setFiltroItem] = useState<string>("");

  const dtDetalle = fichaDT
    ? rankingDT.find((d) => d.member_id === fichaDT)
    : null;
  const jugadorDetalle = fichaJugador
    ? rankingJugadores.find((j) => j.member_id === fichaJugador)
    : null;

  if (dtDetalle) {
    const posicion =
      rankingDT.findIndex((d) => d.member_id === dtDetalle.member_id) + 1;
    return (
      <FichaDT
        dt={dtDetalle}
        posicion={posicion}
        onCerrar={() => setFichaDT(null)}
      />
    );
  }

  if (jugadorDetalle) {
    const posicion =
      rankingJugadores.findIndex(
        (j) => j.member_id === jugadorDetalle.member_id
      ) + 1;
    return (
      <FichaJugador
        jugador={jugadorDetalle}
        posicion={posicion}
        items={items}
        onCerrar={() => setFichaJugador(null)}
      />
    );
  }

  const jugadoresFiltrados = filtroItem
    ? [...rankingJugadores]
        .filter((j) => (j.por_item[filtroItem] ?? 0) > 0)
        .sort((a, b) => {
          const pa = a.por_item[filtroItem] ?? 0;
          const pb = b.por_item[filtroItem] ?? 0;
          if (pb !== pa) return pb - pa;
          return a.alias.localeCompare(b.alias);
        })
    : rankingJugadores;

  return (
    <div>
      <div
        className="mx-3 mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--g1)" }}
      >
        <TabBtn activo={tab === "dt"} onClick={() => setTab("dt")}>
          Posiciones DT del torneo
        </TabBtn>
        <TabBtn activo={tab === "jugadores"} onClick={() => setTab("jugadores")}>
          Posiciones Jugadores del torneo
        </TabBtn>
      </div>

      {tab === "dt" && (
        <>
          <div className="bebas mt-4 px-4 text-xl tracking-wider">
            TABLA GENERAL · DT
          </div>
          <p className="px-4 text-[11px]" style={{ color: "var(--dim)" }}>
            Toca un DT para ver el historial de equipos armados
          </p>
          <div className="mt-1">
            {rankingDT.map((d, idx) => (
              <FilaDT
                key={d.member_id}
                dt={d}
                posicion={idx + 1}
                onClick={() => setFichaDT(d.member_id)}
              />
            ))}
            {rankingDT.length === 0 && (
              <p
                className="px-4 py-6 text-center text-xs"
                style={{ color: "var(--dim)" }}
              >
                Todavía no hay DTs.
              </p>
            )}
          </div>
          <div
            className="mx-3 mt-3 rounded-xl p-3 text-[11px]"
            style={{
              background: "rgba(242,182,50,0.08)",
              borderLeft: "3px solid var(--gold)",
              color: "var(--dim)",
            }}
          >
            Sin desempate: si dos DTs terminan igualados, quedan igualados en la
            tabla.
          </div>
        </>
      )}

      {tab === "jugadores" && (
        <>
          <div className="bebas mt-4 px-4 text-xl tracking-wider">
            TABLA GENERAL · JUGADORES
          </div>
          <p className="px-4 text-[11px]" style={{ color: "var(--dim)" }}>
            Toca un jugador para ver su ficha con desglose por ítem
          </p>

          <div className="mt-3 px-3">
            <div className="flex flex-wrap gap-1.5">
              <ChipActivo
                activo={filtroItem === ""}
                onClick={() => setFiltroItem("")}
              >
                Todos
              </ChipActivo>
              {items.map((it) => (
                <ChipActivo
                  key={it.key}
                  activo={filtroItem === it.key}
                  onClick={() => setFiltroItem(it.key)}
                >
                  {it.label}
                </ChipActivo>
              ))}
            </div>
          </div>

          <div className="mt-2">
            {jugadoresFiltrados.map((j, idx) => (
              <FilaJugador
                key={j.member_id}
                jugador={j}
                posicion={idx + 1}
                filtroItem={filtroItem}
                onClick={() => setFichaJugador(j.member_id)}
              />
            ))}
            {jugadoresFiltrados.length === 0 && (
              <p
                className="px-4 py-6 text-center text-xs"
                style={{ color: "var(--dim)" }}
              >
                Nadie sumó este ítem todavía.
              </p>
            )}
          </div>
        </>
      )}

      {/* Equipo Ideal del Torneo - siempre visible */}
      <div className="bebas mt-8 px-4 text-xl tracking-wider">
        ⭐ EQUIPO IDEAL DEL TORNEO
      </div>
      <p className="px-4 text-[11px]" style={{ color: "var(--dim)" }}>
        {dtDelAnio ? "1 DT + " : ""}
        {equipoIdealAnio.length} mejores jugadores del año
      </p>

      {dtDelAnio && (
        <div className="mx-3 mt-3 flex justify-center">
          <Carta
            alias={dtDelAnio.alias}
            photoUrl={dtDelAnio.photo_url}
            puntos={dtDelAnio.total_points}
            posicion={1}
            estrellas={dtDelAnio.estrellas}
            size="lg"
            onClick={() => setFichaDT(dtDelAnio.member_id)}
          />
        </div>
      )}

      {equipoIdealAnio.length > 0 ? (
        <div className="mx-auto mt-3 px-3" style={{ maxWidth: 500 }}>
          <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{
              aspectRatio: "3 / 4",
              background:
                "repeating-linear-gradient(180deg, #1f6b3a 0 10%, #247a43 10% 20%)",
              border: "2px solid rgba(255,255,255,0.4)",
            }}
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: "30%",
                aspectRatio: "1",
                border: "2.5px solid rgba(255,255,255,0.4)",
              }}
            />
            <div
              className="absolute left-0 right-0 top-1/2"
              style={{ height: 2.5, background: "rgba(255,255,255,0.4)" }}
            />
            {equipoIdealAnio.map((j, idx) => {
              const pos =
                posicionesIdeal(equipoIdealAnio.length)[idx] ?? [50, 50];
              const posicion =
                rankingJugadores.findIndex((x) => x.member_id === j.member_id) +
                1;
              return (
                <div
                  key={j.member_id}
                  className="absolute"
                  style={{
                    left: `${pos[0]}%`,
                    top: `${pos[1]}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <Carta
                    alias={j.alias}
                    photoUrl={j.photo_url}
                    puntos={j.total_points}
                    posicion={posicion}
                    estrellas={j.estrellas}
                    size="sm"
                    onClick={() => setFichaJugador(j.member_id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="mx-3 mt-3 rounded-2xl p-6 text-center text-sm"
          style={{ background: "var(--g1)", color: "var(--dim)" }}
        >
          Todavía no hay puntajes acumulados.
        </div>
      )}
    </div>
  );
}

function TabBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-lg py-2 text-[10px] font-bold transition"
      style={{
        background: activo ? "var(--gold)" : "transparent",
        color: activo ? "#12261c" : "var(--dim)",
      }}
    >
      {children}
    </button>
  );
}

function ChipActivo({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
      style={{
        background: activo ? "var(--gold)" : "transparent",
        borderColor: activo ? "var(--gold)" : "rgba(255,255,255,0.15)",
        color: activo ? "#12261c" : "var(--dim)",
      }}
    >
      {children}
    </button>
  );
}

function FilaDT({
  dt,
  posicion,
  onClick,
}: {
  dt: DTRanking;
  posicion: number;
  onClick: () => void;
}) {
  const colorPos =
    posicion === 1 ? "var(--gold)" : posicion <= 3 ? "var(--tx)" : "var(--dim)";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: dt.is_me
          ? "linear-gradient(90deg, rgba(242,182,50,0.12), transparent)"
          : undefined,
      }}
    >
      <span
        className="w-7 flex-none text-center text-sm font-bold"
        style={{ color: colorPos }}
      >
        {posicion}
      </span>
      <Avatar
        alias={dt.alias}
        photoUrl={dt.photo_url}
        size={40}
        ringColor={posicion === 1 ? "var(--gold)" : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">
            {dt.alias}
            {dt.is_me && (
              <span className="ml-1 text-[10px]" style={{ color: "var(--gold)" }}>
                · vos
              </span>
            )}
          </span>
        </div>
        <div className="text-[11px]" style={{ color: "var(--dim)" }}>
          {dt.estrellas > 0 && `⭐ ${dt.estrellas} · `}
          {dt.equipos.length} fecha{dt.equipos.length !== 1 ? "s" : ""}
        </div>
      </div>
      <span className="bebas text-xl" style={{ color: colorPos }}>
        {dt.total_points}
      </span>
      <span className="text-xs" style={{ color: "var(--dim)" }}>
        ›
      </span>
    </button>
  );
}

function FilaJugador({
  jugador,
  posicion,
  filtroItem,
  onClick,
}: {
  jugador: JugadorRanking;
  posicion: number;
  filtroItem: string;
  onClick: () => void;
}) {
  const colorPos =
    posicion === 1 ? "var(--gold)" : posicion <= 3 ? "var(--tx)" : "var(--dim)";
  const puntos = filtroItem
    ? jugador.por_item[filtroItem] ?? 0
    : jugador.total_points;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: jugador.is_me
          ? "linear-gradient(90deg, rgba(242,182,50,0.12), transparent)"
          : undefined,
      }}
    >
      <span
        className="w-7 flex-none text-center text-sm font-bold"
        style={{ color: colorPos }}
      >
        {posicion}
      </span>
      <Avatar
        alias={jugador.alias}
        photoUrl={jugador.photo_url}
        size={40}
        ringColor={posicion === 1 ? "var(--gold)" : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{jugador.alias}</span>
          {jugador.is_me && (
            <span className="text-[10px]" style={{ color: "var(--gold)" }}>
              · vos
            </span>
          )}
          {jugador.is_invitado && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              INV
            </span>
          )}
          {jugador.tarjetas > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px]"
              style={{ color: "var(--red)" }}
            >
              {Array.from({ length: Math.min(jugador.tarjetas, 3) }).map((_, i) => (
                <span
                  key={i}
                  className="inline-block h-3 w-2 rounded-sm"
                  style={{ background: "var(--red)" }}
                />
              ))}
              {jugador.tarjetas > 3 && `+${jugador.tarjetas - 3}`}
            </span>
          )}
        </div>
        {!filtroItem && jugador.estrellas > 0 && (
          <div className="text-[10px]" style={{ color: "var(--dim)" }}>
            ⭐ {jugador.estrellas} equipo{jugador.estrellas !== 1 ? "s" : ""} ideal
          </div>
        )}
      </div>
      <span className="bebas text-xl" style={{ color: colorPos }}>
        {puntos}
      </span>
      <span className="text-xs" style={{ color: "var(--dim)" }}>
        ›
      </span>
    </button>
  );
}

function FichaDT({
  dt,
  posicion,
  onCerrar,
}: {
  dt: DTRanking;
  posicion: number;
  onCerrar: () => void;
}) {
  const [verHistorial, setVerHistorial] = useState(false);
  const [fechaAbierta, setFechaAbierta] = useState<string | null>(null);

  return (
    <div className="mx-3 mt-3 pb-6">
      <button
        type="button"
        onClick={onCerrar}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition"
        style={{ color: "var(--gold)" }}
      >
        ← Volver al ranking
      </button>

      <div className="mt-3 flex justify-center">
        <Carta
          alias={dt.alias}
          photoUrl={dt.photo_url}
          puntos={dt.total_points}
          posicion={posicion}
          estrellas={dt.estrellas}
          size="lg"
        />
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setVerHistorial((v) => !v)}
          className="rounded-xl border px-4 py-2 text-xs font-bold transition"
          style={{
            borderColor: "var(--gold)",
            color: "var(--gold)",
            background: verHistorial ? "rgba(242,182,50,0.15)" : "transparent",
          }}
        >
          📅 Historial de equipos armados ({dt.equipos.length})
        </button>
      </div>

      {verHistorial && (
        <div className="mt-4">
          {dt.equipos.length === 0 ? (
            <div
              className="rounded-xl p-4 text-center text-xs"
              style={{ background: "var(--g1)", color: "var(--dim)" }}
            >
              Todavía no armó equipos.
            </div>
          ) : (
            [...dt.equipos].reverse().map((eq) => (
              <EquipoHistorial
                key={eq.match_id}
                eq={eq}
                abierto={fechaAbierta === eq.match_id}
                onToggle={() =>
                  setFechaAbierta(
                    fechaAbierta === eq.match_id ? null : eq.match_id
                  )
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EquipoHistorial({
  eq,
  abierto,
  onToggle,
}: {
  eq: EquipoDTFecha;
  abierto: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="mt-2 overflow-hidden rounded-2xl"
      style={{ background: "var(--g1)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold">Fecha {eq.match_number}</div>
          <div className="text-[10px]" style={{ color: "var(--dim)" }}>
            {eq.titulares.length} titulares
            {eq.suplente ? " + 1 suplente" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bebas text-lg" style={{ color: "var(--gold)" }}>
            {eq.points} pts
          </span>
          <span
            className="text-xs transition"
            style={{
              color: "var(--dim)",
              transform: abierto ? "rotate(180deg)" : "rotate(0)",
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {abierto && (
        <div className="px-3 pb-3">
          {eq.titulares.length > 0 ? (
            <CanchaEquipo
              titulares={eq.titulares.map((j) => ({
                member_id: j.member_id,
                alias: j.alias,
                photo_url: j.photo_url,
                points: j.points,
              }))}
              suplente={
                eq.suplente
                  ? {
                      member_id: eq.suplente.member_id,
                      alias: eq.suplente.alias,
                      photo_url: eq.suplente.photo_url,
                      points: eq.suplente.points,
                    }
                  : null
              }
            />
          ) : (
            <div
              className="rounded-xl p-4 text-center text-xs"
              style={{ background: "var(--g2)", color: "var(--dim)" }}
            >
              No hay jugadores registrados en este equipo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FichaJugador({
  jugador,
  posicion,
  items,
  onCerrar,
}: {
  jugador: JugadorRanking;
  posicion: number;
  items: ItemInfo[];
  onCerrar: () => void;
}) {
  const [verHistorial, setVerHistorial] = useState(false);
  const [fechaAbierta, setFechaAbierta] = useState<string | null>(null);

  const itemsLogrados = items.filter((it) => (jugador.por_item[it.key] ?? 0) > 0);

  return (
    <div className="mx-3 mt-3 pb-6">
      <button
        type="button"
        onClick={onCerrar}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition"
        style={{ color: "var(--gold)" }}
      >
        ← Volver al ranking
      </button>

      <div className="mt-3 flex justify-center">
        <Carta
          alias={jugador.alias}
          photoUrl={jugador.photo_url}
          puntos={jugador.total_points}
          posicion={posicion}
          estrellas={jugador.estrellas}
          size="lg"
        />
      </div>

      {jugador.tarjetas > 0 && (
        <div className="mt-3 flex justify-center">
          <div
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ background: "rgba(226,59,77,0.15)", color: "var(--red)" }}
          >
            🟥 {jugador.tarjetas} tarjeta
            {jugador.tarjetas !== 1 ? "s" : ""} roja
            {jugador.tarjetas !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => setVerHistorial((v) => !v)}
          className="rounded-xl border px-4 py-2 text-xs font-bold transition"
          style={{
            borderColor: "var(--gold)",
            color: "var(--gold)",
            background: verHistorial ? "rgba(242,182,50,0.15)" : "transparent",
          }}
        >
          📅 Historial fecha a fecha ({jugador.por_fecha.length})
        </button>
      </div>

      {verHistorial && (
        <div className="mt-4">
          {jugador.por_fecha.length === 0 ? (
            <div
              className="rounded-xl p-4 text-center text-xs"
              style={{ background: "var(--g1)", color: "var(--dim)" }}
            >
              Todavía no sumó puntos.
            </div>
          ) : (
            [...jugador.por_fecha].reverse().map((f) => (
              <FechaHistorial
                key={f.match_id}
                fecha={f}
                abierta={fechaAbierta === f.match_id}
                onToggle={() =>
                  setFechaAbierta(
                    fechaAbierta === f.match_id ? null : f.match_id
                  )
                }
              />
            ))
          )}
        </div>
      )}

      <div className="bebas mt-5 px-1 text-lg tracking-wider">
        ESTADÍSTICAS DEL TORNEO
      </div>
      <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
        Puntaje acumulado de todas las fechas
      </p>

      <div className="mt-2">
        {itemsLogrados.length > 0 ? (
          <div
            className="grid grid-cols-2 gap-2 rounded-2xl p-3"
            style={{ background: "var(--g1)" }}
          >
            {itemsLogrados.map((it) => (
              <div
                key={it.key}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span className="truncate text-[11px]">{it.label}</span>
                <span
                  className="bebas text-base"
                  style={{ color: "var(--gold)" }}
                >
                  {jugador.por_item[it.key]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 text-center text-sm"
            style={{ background: "var(--g1)", color: "var(--dim)" }}
          >
            No sumó puntos en el torneo todavía.
          </div>
        )}
      </div>
    </div>
  );
}

function FechaHistorial({
  fecha,
  abierta,
  onToggle,
}: {
  fecha: ResultadoFechaJugador;
  abierta: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="mt-2 overflow-hidden rounded-2xl"
      style={{ background: "var(--g1)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold">Fecha {fecha.match_number}</div>
          <div className="text-[10px]" style={{ color: "var(--dim)" }}>
            {fecha.items.length} ítem{fecha.items.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bebas text-lg" style={{ color: "var(--gold)" }}>
            {fecha.points} pts
          </span>
          <span
            className="text-xs transition"
            style={{
              color: "var(--dim)",
              transform: abierta ? "rotate(180deg)" : "rotate(0)",
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {abierta && (
        <div className="space-y-1 px-3 pb-3">
          {fecha.items.map((it, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-[11px]">{it.label}</span>
              <span className="bebas text-base" style={{ color: "var(--gold)" }}>
                +{it.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function posicionesIdeal(n: number): [number, number][] {
  const map: Record<number, [number, number][]> = {
    5: [
      [50, 18],
      [20, 50],
      [40, 50],
      [60, 50],
      [80, 50],
    ],
    6: [
      [30, 20],
      [70, 20],
      [30, 55],
      [70, 55],
      [30, 85],
      [70, 85],
    ],
    7: [
      [50, 15],
      [20, 45],
      [50, 45],
      [80, 45],
      [20, 80],
      [50, 80],
      [80, 80],
    ],
    8: [
      [25, 15],
      [75, 15],
      [20, 45],
      [50, 45],
      [80, 45],
      [25, 82],
      [50, 82],
      [75, 82],
    ],
    9: [
      [50, 12],
      [20, 38],
      [50, 38],
      [80, 38],
      [20, 68],
      [50, 68],
      [80, 68],
      [35, 92],
      [65, 92],
    ],
    10: [
      [50, 10],
      [20, 35],
      [50, 35],
      [80, 35],
      [20, 60],
      [50, 60],
      [80, 60],
      [20, 88],
      [50, 88],
      [80, 88],
    ],
    11: [
      [50, 10],
      [15, 35],
      [38, 35],
      [62, 35],
      [85, 35],
      [20, 62],
      [50, 62],
      [80, 62],
      [20, 90],
      [50, 90],
      [80, 90],
    ],
  };
  return map[n] ?? [[50, 50]];
}