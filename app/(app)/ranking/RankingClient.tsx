"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import type { DTRanking, JugadorRanking, ItemInfo } from "./page";

type Props = {
  rankingDT: DTRanking[];
  rankingJugadores: JugadorRanking[];
  equipoIdealAnio: JugadorRanking[];
  items: ItemInfo[];
};

type Tab = "dt" | "jugadores" | "ideal";

export default function RankingClient({
  rankingDT,
  rankingJugadores,
  equipoIdealAnio,
  items,
}: Props) {
  const [tab, setTab] = useState<Tab>("dt");
  const [filtroItem, setFiltroItem] = useState<string>("");
  const [fichaDT, setFichaDT] = useState<string | null>(null);
  const [fichaJugador, setFichaJugador] = useState<string | null>(null);

  // Ranking de jugadores filtrado por ítem
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

  const jugadorDetalle = fichaJugador
    ? rankingJugadores.find((j) => j.member_id === fichaJugador)
    : null;
  const dtDetalle = fichaDT
    ? rankingDT.find((d) => d.member_id === fichaDT)
    : null;

  // Si hay una ficha abierta, mostrar la ficha
  if (jugadorDetalle) {
    return (
      <FichaJugador
        jugador={jugadorDetalle}
        items={items}
        onVolver={() => setFichaJugador(null)}
      />
    );
  }

  if (dtDetalle) {
    return (
      <FichaDT
        dt={dtDetalle}
        onVolver={() => setFichaDT(null)}
      />
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mx-3 mt-3 flex gap-1 rounded-xl p-1" style={{ background: "var(--g1)" }}>
        <TabBtn activo={tab === "dt"} onClick={() => setTab("dt")}>
          DT
        </TabBtn>
        <TabBtn activo={tab === "jugadores"} onClick={() => setTab("jugadores")}>
          Jugadores
        </TabBtn>
        <TabBtn activo={tab === "ideal"} onClick={() => setTab("ideal")}>
          Ideal del año
        </TabBtn>
      </div>

      {/* Ranking DT */}
      {tab === "dt" && (
        <div className="mt-2">
          {rankingDT.map((d, idx) => (
            <FilaDT
              key={d.member_id}
              dt={d}
              posicion={idx + 1}
              onClick={() => setFichaDT(d.member_id)}
            />
          ))}
          {rankingDT.length === 0 && (
            <p className="px-4 py-6 text-center text-xs" style={{ color: "var(--dim)" }}>
              Todavía no hay DTs con puntaje.
            </p>
          )}
        </div>
      )}

      {/* Ranking Jugadores */}
      {tab === "jugadores" && (
        <>
          {/* Filtro por ítem */}
          <div className="mt-3 px-3">
            <div className="flex flex-wrap gap-1.5">
              <ChipActivo activo={filtroItem === ""} onClick={() => setFiltroItem("")}>
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
              <p className="px-4 py-6 text-center text-xs" style={{ color: "var(--dim)" }}>
                Nadie ganó este ítem todavía.
              </p>
            )}
          </div>
        </>
      )}

      {/* Equipo Ideal del año */}
      {tab === "ideal" && (
        <div className="mt-3">
          <p className="px-4 text-[11px]" style={{ color: "var(--dim)" }}>
            Los {equipoIdealAnio.length} mejores jugadores del año
          </p>
          <div className="mt-2">
            {equipoIdealAnio.map((j, idx) => (
              <FilaJugador
                key={j.member_id}
                jugador={j}
                posicion={idx + 1}
                filtroItem=""
                destacado
                onClick={() => setFichaJugador(j.member_id)}
              />
            ))}
            {equipoIdealAnio.length === 0 && (
              <p className="px-4 py-6 text-center text-xs" style={{ color: "var(--dim)" }}>
                Todavía no hay puntajes en la temporada.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────────────────────

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
      className="flex-1 rounded-lg py-2 text-xs font-bold transition"
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
        <div className="truncate text-sm font-semibold">
          {dt.alias}
          {dt.is_me && (
            <span className="ml-1 text-[10px]" style={{ color: "var(--gold)" }}>
              · vos
            </span>
          )}
        </div>
        <div className="text-[11px]" style={{ color: "var(--dim)" }}>
          {dt.fechas_jugadas} fecha{dt.fechas_jugadas !== 1 ? "s" : ""}
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
  destacado,
  onClick,
}: {
  jugador: JugadorRanking;
  posicion: number;
  filtroItem: string;
  destacado?: boolean;
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
        background: destacado
          ? "rgba(242,182,50,0.08)"
          : jugador.is_me
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
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--red)" }}>
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

// ────────────────────────────────────────────────────────────────
// Ficha de jugador
// ────────────────────────────────────────────────────────────────

function FichaJugador({
  jugador,
  items,
  onVolver,
}: {
  jugador: JugadorRanking;
  items: ItemInfo[];
  onVolver: () => void;
}) {
  return (
    <div className="mx-3 mt-3 rounded-2xl" style={{ background: "var(--g1)" }}>
      <button
        type="button"
        onClick={onVolver}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span style={{ color: "var(--gold)" }}>←</span>
        <span className="text-xs font-semibold">Volver al ranking</span>
      </button>

      <div className="p-5 text-center">
        <div className="flex justify-center">
          <Avatar
            alias={jugador.alias}
            photoUrl={jugador.photo_url}
            size={80}
            ringColor="var(--gold)"
          />
        </div>
        <div className="mt-3">
          <div className="bebas text-2xl">{jugador.alias}</div>
          {jugador.is_invitado && (
            <div className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--or)", color: "#fff" }}>
              INVITADO
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center gap-6">
          <div>
            <div className="bebas text-3xl" style={{ color: "var(--gold)" }}>
              {jugador.total_points}
            </div>
            <div className="text-[10px]" style={{ color: "var(--dim)" }}>
              PUNTOS
            </div>
          </div>
          <div>
            <div className="bebas text-3xl" style={{ color: jugador.tarjetas > 0 ? "var(--red)" : "var(--dim)" }}>
              {jugador.tarjetas}
            </div>
            <div className="text-[10px]" style={{ color: "var(--dim)" }}>
              ROJAS
            </div>
          </div>
        </div>
      </div>

      {/* Detalle por ítem */}
      <div className="border-t px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="bebas text-sm tracking-wider" style={{ color: "var(--gold)" }}>
          PUNTOS POR ÍTEM
        </div>
        <div className="mt-2 space-y-1">
          {items.map((it) => {
            const pts = jugador.por_item[it.key] ?? 0;
            return (
              <div
                key={it.key}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <span className="text-xs">{it.label}</span>
                <span
                  className="bebas text-base"
                  style={{ color: pts > 0 ? "var(--gold)" : "var(--dim)" }}
                >
                  {pts}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Ficha de DT
// ────────────────────────────────────────────────────────────────

function FichaDT({
  dt,
  onVolver,
}: {
  dt: DTRanking;
  onVolver: () => void;
}) {
  return (
    <div className="mx-3 mt-3 rounded-2xl" style={{ background: "var(--g1)" }}>
      <button
        type="button"
        onClick={onVolver}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span style={{ color: "var(--gold)" }}>←</span>
        <span className="text-xs font-semibold">Volver al ranking</span>
      </button>

      <div className="p-5 text-center">
        <div className="flex justify-center">
          <Avatar
            alias={dt.alias}
            photoUrl={dt.photo_url}
            size={80}
            ringColor="var(--gold)"
          />
        </div>
        <div className="mt-3">
          <div className="bebas text-2xl">{dt.alias}</div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-6">
          <div>
            <div className="bebas text-3xl" style={{ color: "var(--gold)" }}>
              {dt.total_points}
            </div>
            <div className="text-[10px]" style={{ color: "var(--dim)" }}>
              PUNTOS
            </div>
          </div>
          <div>
            <div className="bebas text-3xl" style={{ color: "var(--tx)" }}>
              {dt.fechas_jugadas}
            </div>
            <div className="text-[10px]" style={{ color: "var(--dim)" }}>
              FECHAS
            </div>
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3 text-xs" style={{ borderColor: "rgba(255,255,255,0.06)", color: "var(--dim)" }}>
        Detalle de equipos por fecha: se va a agregar en el próximo paso.
      </div>
    </div>
  );
}