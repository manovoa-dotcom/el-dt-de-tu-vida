import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConvocatoriaClient from "./ConvocatoriaClient";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export type Fila = {
  member_id: string;
  alias: string;
  real_name: string | null;
  photo_url: string | null;
  valor: number;
  is_me: boolean;
  is_invitado: boolean;
  attendance_status: string | null;
  waitlist_order: number | null;
  racha_ausencias: number;
};

export type MiPick = { member_id: string; slot: "titular" | "suplente" };

export default async function ConvocatoriaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("id, group_id, role, display_name")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Convocatoria</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No estás activo en el grupo.
        </p>
      </div>
    );
  }

  // Próximo partido
  const { data: partido } = await supabase
    .from("matches")
    .select(
      "id, number, kickoff_at, place, cupo, budget, status, baja_closes_at, teams_lock_at, season_id"
    )
    .eq("group_id", membership.group_id)
    .eq("status", "programada")
    .gte("kickoff_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!partido) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Convocatoria</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No hay partido programado. El admin tiene que cargar la próxima fecha.
        </p>
      </div>
    );
  }

  // Todos los miembros del grupo (activos + invitados)
  const { data: miembrosRaw } = await supabase
    .from("group_members")
    .select("id, display_name, user_id, status, role")
    .eq("group_id", membership.group_id)
    .in("status", ["activo", "invitado"])
    .order("display_name");

  const userIds = (miembrosRaw ?? [])
    .map((m) => m.user_id)
    .filter((x): x is string => !!x);

  let perfiles: Record<string, { real_name: string | null; photo_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, real_name, photo_url")
      .in("id", userIds);
    perfiles = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, { real_name: p.real_name, photo_url: p.photo_url }])
    );
  }

  // Asistencias al partido actual
  const { data: asistenciaActual } = await supabase
    .from("attendance")
    .select("member_id, status, waitlist_order")
    .eq("match_id", partido.id);

  const asistenciaMap = new Map(
    (asistenciaActual ?? []).map((a) => [a.member_id, a])
  );

  // Valores de mercado para esta fecha
  const { data: valores } = await supabase
    .from("market_values")
    .select("member_id, value")
    .eq("season_id", partido.season_id)
    .eq("match_number", partido.number);

  const valoresMap = new Map((valores ?? []).map((v) => [v.member_id, v.value]));

  // ─── Racha de ausencias ───
  // Traer todos los partidos anteriores de la temporada (jugados o cerrados)
  const { data: partidosAnteriores } = await supabase
    .from("matches")
    .select("id, number")
    .eq("season_id", partido.season_id)
    .lt("number", partido.number)
    .in("status", ["jugada", "cerrada"])
    .order("number", { ascending: false });

  const partidosIds = (partidosAnteriores ?? []).map((p) => p.id);

  let asistenciasHistorico: { match_id: string; member_id: string; status: string }[] = [];
  if (partidosIds.length > 0) {
    const { data: hist } = await supabase
      .from("attendance")
      .select("match_id, member_id, status")
      .in("match_id", partidosIds);
    asistenciasHistorico = hist ?? [];
  }

  // Para cada miembro: contar cuántas fechas seguidas no se anotó
  // (del partido más reciente hacia atrás, parando cuando encuentra uno anotado)
  const ordenPorFecha = new Map<string, number>();
  (partidosAnteriores ?? []).forEach((p) => ordenPorFecha.set(p.id, p.number));

  const asistenciasPorMiembro = new Map<string, { match_id: string; status: string }[]>();
  for (const a of asistenciasHistorico) {
    if (!asistenciasPorMiembro.has(a.member_id)) {
      asistenciasPorMiembro.set(a.member_id, []);
    }
    asistenciasPorMiembro.get(a.member_id)!.push({ match_id: a.match_id, status: a.status });
  }

  function calcularRacha(memberId: string): number {
    const historial = asistenciasPorMiembro.get(memberId) ?? [];
    // Ordenar por número de partido descendente
    historial.sort(
      (a, b) =>
        (ordenPorFecha.get(b.match_id) ?? 0) - (ordenPorFecha.get(a.match_id) ?? 0)
    );

    // Si no jugó la fecha más reciente, ya suma 1. Y contamos para atrás.
    // Mapeamos las fechas anteriores con su estado (o sin asistencia).
    const estadoPorMatch = new Map(historial.map((h) => [h.match_id, h.status]));
    let racha = 0;
    for (const p of partidosAnteriores ?? []) {
      const est = estadoPorMatch.get(p.id);
      if (est === "anotado" || est === "presente") {
        break; // se anotó → corta la racha
      }
      racha++;
    }
    return racha;
  }

  // Construir filas
  const convocados: Fila[] = [];
  const noAnotados: Fila[] = [];

  for (const m of miembrosRaw ?? []) {
    const asist = asistenciaMap.get(m.id);
    const uid = m.user_id;
    const perfil = uid ? perfiles[uid] : null;

    const fila: Fila = {
      member_id: m.id,
      alias: m.display_name,
      real_name: perfil?.real_name ?? null,
      photo_url: perfil?.photo_url ?? null,
      valor: valoresMap.get(m.id) ?? 0,
      is_me: m.id === membership.id,
      is_invitado: m.status === "invitado",
      attendance_status: asist?.status ?? null,
      waitlist_order: asist?.waitlist_order ?? null,
      racha_ausencias: m.status === "invitado" ? 0 : calcularRacha(m.id),

    };

    const activo =
      asist?.status === "anotado" ||
      asist?.status === "presente" ||
      asist?.status === "lista_espera";

    if (activo) convocados.push(fila);
    else noAnotados.push(fila);
  }

  // Ordenar convocados: anotados primero, después lista de espera
  convocados.sort((a, b) => {
    const rank = (s: string | null) =>
      s === "anotado" || s === "presente" ? 0 : s === "lista_espera" ? 1 : 2;
    return rank(a.attendance_status) - rank(b.attendance_status);
  });

  // Ordenar no anotados por racha descendente (los más ausentes primero)
  noAnotados.sort((a, b) => b.racha_ausencias - a.racha_ausencias);

  // Mi equipo actual (si existe)
  const { data: miTeam } = await supabase
    .from("fantasy_teams")
    .select("id, fantasy_picks(member_id, slot)")
    .eq("match_id", partido.id)
    .eq("dt_member_id", membership.id)
    .maybeSingle();

  const miEquipo: MiPick[] = (miTeam?.fantasy_picks ?? []).map(
    (p: { member_id: string; slot: string }) => ({
      member_id: p.member_id,
      slot: p.slot as "titular" | "suplente",
    })
  );

  const yo = convocados.find((c) => c.is_me) ?? noAnotados.find((c) => c.is_me);
  const anotadosCount = convocados.filter(
    (c) => c.attendance_status === "anotado" || c.attendance_status === "presente"
  ).length;

  const kickoff = new Date(partido.kickoff_at);
  const bajaCloses = new Date(partido.baja_closes_at);
  const equiposBloqueados = new Date() > new Date(partido.teams_lock_at);

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <h1 className="bebas text-3xl">Convocatoria</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Fecha {partido.number} · {DIAS[kickoff.getDay()]} {kickoff.getDate()} de{" "}
          {MESES[kickoff.getMonth()]} · {String(kickoff.getHours()).padStart(2, "0")}:
          {String(kickoff.getMinutes()).padStart(2, "0")} hs
        </p>
      </header>

      <ConvocatoriaClient
        matchId={partido.id}
        cupo={partido.cupo}
        anotadosCount={anotadosCount}
        convocados={convocados}
        noAnotados={noAnotados}
        miEstado={yo?.attendance_status ?? null}
        isAdmin={membership.role === "admin"}
        bajaClosesIso={bajaCloses.toISOString()}
        lugar={partido.place}
        miEquipo={miEquipo}
        equiposBloqueados={equiposBloqueados}
        presupuesto={partido.budget}
      />

      <div className="h-8" />
    </div>
  );
}