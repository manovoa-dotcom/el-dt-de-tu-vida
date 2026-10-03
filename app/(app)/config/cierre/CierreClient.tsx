"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { cerrarTemporada, iniciarNuevaTemporada } from "./actions";

type PremioItem = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  cantidad: number;
  extra?: string;
};

type PodioItem = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  total_points: number;
};

type ResumenCierre = {
  podio: PodioItem[];
  equipo_ideal: { dt: PodioItem | null; jugadores: PremioItem[] };
  premios: {
    goleador: PremioItem | null;
    mejor_arquero: PremioItem | null;
    mas_garra: PremioItem | null;
    buen_companero: PremioItem | null;
    tarjetas_rojas: PremioItem | null;
  };
  presentismo_sorpresa: PremioItem | null;
  fechas_jugadas: number;
  cerrado_at: string;
};

type Temporada = {
  id: string;
  name: string;
  resumen_cierre: ResumenCierre | null;
  closed_at: string | null;
};

export default function CierreClient({
  temporadaActiva,
  historial,
}: {
  temporadaActiva: Temporada | null;
  historial: Temporada[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    texto: string;
    tipo: "ok" | "error";
  } | null>(null);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [confirmandoNueva, setConfirmandoNueva] = useState(false);

  function mostrarToast(texto: string, tipo: "ok" | "error" = "ok") {
    setToast({ texto, tipo });
    setTimeout(() => setToast(null), 3500);
  }

  function handleCerrar() {
    startTransition(async () => {
      const res = await cerrarTemporada();
      if (res.ok) {
        setConfirmandoCierre(false);
        mostrarToast("¡Temporada cerrada!");
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error", "error");
      }
    });
  }

  function handleIniciar() {
    if (nombreNueva.trim().length < 3) {
      mostrarToast("Poné un nombre de al menos 3 caracteres", "error");
      return;
    }
    startTransition(async () => {
      const res = await iniciarNuevaTemporada(nombreNueva);
      if (res.ok) {
        setConfirmandoNueva(false);
        setNombreNueva("");
        mostrarToast("¡Temporada nueva iniciada!");
        router.refresh();
      } else {
        mostrarToast(res.error ?? "Error", "error");
      }
    });
  }

  return (
    <div className="mx-3 mt-3">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{
            background: toast.tipo === "error" ? "var(--red)" : "var(--gold)",
            color: toast.tipo === "error" ? "#fff" : "#12261c",
          }}
        >
          {toast.texto}
        </div>
      )}

      {/* ─── Estado actual ─── */}
      {temporadaActiva ? (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "linear-gradient(160deg, #1b4f39, #11352a)",
            border: "1px solid var(--gold)",
          }}
        >
          <div
            className="bebas text-xs tracking-widest"
            style={{ color: "var(--gold)" }}
          >
            TEMPORADA EN CURSO
          </div>
          <div className="bebas mt-1 text-2xl">{temporadaActiva.name}</div>
          <p className="mt-2 text-xs" style={{ color: "var(--dim)" }}>
            Cuando termines de cargar la última fecha, cerrá la temporada para
            ver el resumen del año y arrancar una nueva.
          </p>

          {!confirmandoCierre ? (
            <button
              type="button"
              onClick={() => setConfirmandoCierre(true)}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold transition"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              🏁 Cerrar temporada
            </button>
          ) : (
            <div className="mt-4 rounded-xl border-2 p-4" style={{ borderColor: "var(--red)" }}>
              <div className="text-sm font-bold" style={{ color: "var(--red)" }}>
                ⚠️ ¿Estás seguro?
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--tx)" }}>
                Se va a guardar un resumen del año, se coronará al campeón y la
                temporada quedará archivada. Después vas a poder iniciar una
                nueva.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmandoCierre(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border py-2 text-xs font-bold"
                  style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--dim)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCerrar}
                  disabled={isPending}
                  className="flex-1 rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                  style={{ background: "var(--red)", color: "#fff" }}
                >
                  {isPending ? "Cerrando..." : "Sí, cerrar"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl p-5"
          style={{
            background: "rgba(242,182,50,0.08)",
            border: "1px solid rgba(242,182,50,0.4)",
          }}
        >
          <div className="bebas text-xs tracking-widest" style={{ color: "var(--gold)" }}>
            SIN TEMPORADA ACTIVA
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--tx)" }}>
            Ya cerraste la última temporada. Ahora podés iniciar una nueva.
          </p>

          {!confirmandoNueva ? (
            <button
              type="button"
              onClick={() => setConfirmandoNueva(true)}
              className="mt-4 w-full rounded-xl py-3 text-sm font-bold transition"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              🚀 Iniciar temporada nueva
            </button>
          ) : (
            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--dim)" }}>
                Nombre de la temporada nueva
              </label>
              <input
                type="text"
                value={nombreNueva}
                onChange={(e) => setNombreNueva(e.target.value)}
                placeholder="Ej: Temporada 2027"
                maxLength={40}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmandoNueva(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border py-2 text-xs font-bold"
                  style={{ borderColor: "rgba(255,255,255,0.2)", color: "var(--dim)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleIniciar}
                  disabled={isPending}
                  className="flex-1 rounded-xl py-2 text-xs font-bold disabled:opacity-50"
                  style={{ background: "var(--or)", color: "#fff" }}
                >
                  {isPending ? "Creando..." : "Iniciar temporada"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Último cierre ─── */}
      {historial.length > 0 && historial[0].resumen_cierre && (
        <ResumenCierreUI
          temporada={historial[0]}
          esUltima
        />
      )}

      {/* ─── Salón de la fama ─── */}
      {historial.length > 1 && (
        <>
          <div className="bebas mt-6 px-1 text-xl tracking-wider">
            🏆 SALÓN DE LA FAMA
          </div>
          <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
            Campeones de temporadas anteriores
          </p>
          <div className="mt-2">
            {historial.slice(1).map((t) => {
              const campeon = t.resumen_cierre?.podio?.[0];
              return (
                <div
                  key={t.id}
                  className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-3"
                  style={{
                    background: "var(--g1)",
                    border: "1px solid rgba(242,182,50,0.3)",
                  }}
                >
                  {campeon && (
                    <Avatar
                      alias={campeon.alias}
                      photoUrl={campeon.photo_url}
                      size={44}
                      ringColor="var(--gold)"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold" style={{ color: "var(--gold)" }}>
                      🏆 {campeon?.alias ?? "—"}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--dim)" }}>
                      {t.name} · {campeon?.total_points ?? 0} pts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Resumen del cierre
// ────────────────────────────────────────────────────────────────

function ResumenCierreUI({
  temporada,
  esUltima,
}: {
  temporada: Temporada;
  esUltima?: boolean;
}) {
  const r = temporada.resumen_cierre;
  if (!r) return null;

  return (
    <div className="mt-6">
      <div className="bebas px-1 text-xl tracking-wider">
        {esUltima ? "📋 RESUMEN DEL AÑO" : `📋 ${temporada.name}`}
      </div>
      <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
        {r.fechas_jugadas} fechas jugadas
      </p>

      {/* Podio */}
      {r.podio.length > 0 && (
        <div
          className="mt-3 rounded-2xl p-4"
          style={{
            background: "linear-gradient(160deg, #1b4f39, #11352a)",
            border: "1px solid var(--gold)",
          }}
        >
          <div className="bebas text-sm tracking-widest" style={{ color: "var(--gold)" }}>
            🏆 CAMPEÓN DT
          </div>
          <div className="mt-3 flex items-end justify-center gap-2">
            {[1, 0, 2].map((orden) => {
              const p = r.podio[orden];
              if (!p) return null;
              const medalla = orden === 0 ? "🥇" : orden === 1 ? "🥈" : "🥉";
              return (
                <div
                  key={p.member_id}
                  className="flex flex-col items-center"
                  style={{ flex: 1 }}
                >
                  <div className="mb-1 text-2xl">{medalla}</div>
                  <Avatar
                    alias={p.alias}
                    photoUrl={p.photo_url}
                    size={orden === 0 ? 56 : 44}
                    ringColor={orden === 0 ? "var(--gold)" : undefined}
                  />
                  <div className="mt-1 truncate text-center text-xs font-bold" style={{ maxWidth: 90 }}>
                    {p.alias}
                  </div>
                  <div className="bebas text-xl" style={{ color: "var(--gold)" }}>
                    {p.total_points}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Equipo Ideal del Año */}
      {r.equipo_ideal.jugadores.length > 0 && (
        <>
          <div className="bebas mt-4 px-1 text-lg tracking-wider">
            ⭐ EQUIPO IDEAL DEL AÑO
          </div>
          <div
            className="mt-2 rounded-2xl p-4"
            style={{ background: "var(--g1)" }}
          >
            {r.equipo_ideal.dt && (
              <div className="mb-3 flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(242,182,50,0.1)" }}>
                <Avatar
                  alias={r.equipo_ideal.dt.alias}
                  photoUrl={r.equipo_ideal.dt.photo_url}
                  size={44}
                  ringColor="var(--gold)"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                    DT DEL AÑO
                  </div>
                  <div className="text-sm font-bold">{r.equipo_ideal.dt.alias}</div>
                </div>
                <div className="bebas text-xl" style={{ color: "var(--gold)" }}>
                  {r.equipo_ideal.dt.total_points}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {r.equipo_ideal.jugadores.map((j) => (
                <div
                  key={j.member_id}
                  className="flex flex-col items-center rounded-xl p-2"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <Avatar alias={j.alias} photoUrl={j.photo_url} size={44} />
                  <div className="mt-1 truncate text-[10px] font-bold text-center" style={{ maxWidth: "100%" }}>
                    {j.alias}
                  </div>
                  <div className="bebas text-base" style={{ color: "var(--gold)" }}>
                    {j.cantidad}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Premios */}
      <div className="bebas mt-4 px-1 text-lg tracking-wider">
        🎖️ PREMIOS DEL AÑO
      </div>
      <div className="mt-2 space-y-1">
        {r.premios.goleador && (
          <PremioFila
            icono="⚽"
            titulo="Goleador"
            alias={r.premios.goleador.alias}
            cantidad={r.premios.goleador.cantidad}
            extra="goles"
          />
        )}
        {r.premios.mejor_arquero && (
          <PremioFila
            icono="🧤"
            titulo="Mejor arquero"
            alias={r.premios.mejor_arquero.alias}
            cantidad={r.premios.mejor_arquero.cantidad}
            extra="veces"
          />
        )}
        {r.premios.mas_garra && (
          <PremioFila
            icono="🔥"
            titulo="Más garra"
            alias={r.premios.mas_garra.alias}
            cantidad={r.premios.mas_garra.cantidad}
            extra="veces"
          />
        )}
        {r.premios.buen_companero && (
          <PremioFila
            icono="🤝"
            titulo="Buen compañero"
            alias={r.premios.buen_companero.alias}
            cantidad={r.premios.buen_companero.cantidad}
            extra="veces"
          />
        )}
        {r.premios.tarjetas_rojas && r.premios.tarjetas_rojas.cantidad > 0 && (
          <PremioFila
            icono="🟥"
            titulo="Más tarjetas rojas"
            alias={r.premios.tarjetas_rojas.alias}
            cantidad={r.premios.tarjetas_rojas.cantidad}
            extra="rojas"
            color="var(--red)"
          />
        )}
      </div>

      {/* Premio sorpresa */}
      {r.presentismo_sorpresa && (
        <>
          <div className="bebas mt-4 px-1 text-lg tracking-wider" style={{ color: "var(--gold)" }}>
            🎁 PREMIO SORPRESA · PRESENTISMO
          </div>
          <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
            El que más fechas seguidas jugó sin faltar
          </p>
          <div
            className="mt-2 flex items-center gap-3 rounded-2xl p-4"
            style={{
              background: "linear-gradient(160deg, #1b4f39, #11352a)",
              border: "1px solid var(--gold)",
            }}
          >
            <Avatar
              alias={r.presentismo_sorpresa.alias}
              photoUrl={r.presentismo_sorpresa.photo_url}
              size={56}
              ringColor="var(--gold)"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold" style={{ color: "var(--gold)" }}>
                {r.presentismo_sorpresa.alias}
              </div>
              <div className="text-[11px]" style={{ color: "var(--dim)" }}>
                {r.presentismo_sorpresa.cantidad} fechas seguidas
                {r.presentismo_sorpresa.extra
                  ? ` · ${r.presentismo_sorpresa.extra}`
                  : ""}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PremioFila({
  icono,
  titulo,
  alias,
  cantidad,
  extra,
  color,
}: {
  icono: string;
  titulo: string;
  alias: string;
  cantidad: number;
  extra: string;
  color?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-2"
      style={{ background: "var(--g1)" }}
    >
      <span className="text-xl">{icono}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--dim)" }}>
          {titulo}
        </div>
        <div className="truncate text-sm font-semibold">{alias}</div>
      </div>
      <div className="bebas text-lg" style={{ color: color ?? "var(--gold)" }}>
        {cantidad} <span className="text-[10px]" style={{ color: "var(--dim)" }}>{extra}</span>
      </div>
    </div>
  );
}