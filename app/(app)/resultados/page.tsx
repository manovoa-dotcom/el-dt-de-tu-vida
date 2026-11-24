import { getCurrentGroupMembership } from "@/lib/group-context";
import { createClient } from "@/lib/supabase/server";
import { calcularPuntajeDT } from "@/lib/puntaje-dt";
import { redirect } from "next/navigation";
import ResultadosClient from "./ResultadosClient";

export type ItemGanado = {
  label: string;
  points: number;
};

export type JugadorResultado = {
  member_id: string;
  alias: string;
  real_name: string;
  photo_url: string | null;
  is_invitado: boolean;
  points: number;
  items: ItemGanado[];
};

export type JugadorEquipoDT = Pick<
  JugadorResultado,
  "member_id" | "alias" | "real_name" | "photo_url" | "points" | "items"
>;

export type DTResultado = {
  member_id: string;
  real_name: string;
  alias: string;
  photo_url: string | null;
  points: number;
  picks_count: number;
  equipo: {
    titulares: JugadorEquipoDT[];
    suplente: JugadorEquipoDT | null;
  };
};

export type PartidoResumen = {
  id: string;
  number: number;
  kickoff_at: string;
  place: string | null;
  cupo: number;
};

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Resultados</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No estás activo en el grupo.
        </p>
      </div>
    );
  }

  // Temporada activa
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("group_id", membership.group_id)
    .eq("status", "activa")
    .maybeSingle();

  if (!season) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Resultados</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No hay temporada activa.
        </p>
      </div>
    );
  }

  // Todos los partidos jugados/cerrados
  const { data: partidos } = await supabase
    .from("matches")
    .select("id, number, kickoff_at, place, cupo")
    .eq("season_id", season.id)
    .in("status", ["jugada", "cerrada"])
    .order("number", { ascending: false });

  if (!partidos || partidos.length === 0) {
    return (
      <div>
        <header className="px-4 pb-2 pt-6">
          <h1 className="bebas text-3xl">Resultados</h1>
          <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
            {season.name}
          </p>
        </header>
        <div
          className="mx-3 mt-3 rounded-2xl p-6 text-center"
          style={{
            background: "var(--g1)",
            border: "1px dashed rgba(255,255,255,0.15)",
          }}
        >
          <div className="text-4xl">📊</div>
          <p className="bebas mt-3 text-xl">Sin resultados todavía</p>
          <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
            Cuando se juegue la primera fecha, vas a ver acá los puntajes.
          </p>
        </div>
      </div>
    );
  }

    // Fecha seleccionada (por query o la última)
  const params = await searchParams;
  const fechaQuery = params.fecha ? parseInt(params.fecha, 10) : null;

  const partidoActual: PartidoResumen =
    (fechaQuery
      ? partidos.find((p) => p.number === fechaQuery)
      : undefined) ?? partidos[0]!;

   // Todos los convocados del partido (jugadores que estuvieron)
  const { data: asistencias } = await supabase
    .from("attendance")
    .select("member_id, status")
    .eq("match_id", partidoActual.id)
    .in("status", ["anotado", "presente", "ausente_sin_aviso"]);

  // Puntajes de jugadores de la fecha
  const { data: scoresRaw } = await supabase
    .from("player_scores")
    .select("member_id, points")
    .eq("match_id", partidoActual.id);

  const scoresMap = new Map(
    (scoresRaw ?? []).map((s) => [s.member_id, s.points])
  );
  // Detalle de ítems ganados por cada jugador
  const { data: winsRaw } = await supabase
    .from("match_item_wins")
    .select(
      `member_id, item:items (label, points)`
    )
    .eq("match_id", partidoActual.id);

  const itemsPorJugador = new Map<string, ItemGanado[]>();
  for (const w of winsRaw ?? []) {
    const it = w.item as unknown as { label: string; points: number } | null;
    if (!it) continue;
    if (!itemsPorJugador.has(w.member_id)) {
      itemsPorJugador.set(w.member_id, []);
    }
    itemsPorJugador.get(w.member_id)!.push({ label: it.label, points: it.points });
  }

  // Puntajes de DT
  const { data: dtScoresRaw } = await supabase
    .from("dt_scores")
    .select("dt_member_id, points")
    .eq("match_id", partidoActual.id)
    .order("points", { ascending: false });

  const { data: fantasyTeamsRaw, error: fantasyTeamsError } = await supabase
    .from("fantasy_teams")
    .select("id, dt_member_id")
    .eq("match_id", partidoActual.id);

  if (fantasyTeamsError) {
    console.error("Error fetching fantasy_teams:", fantasyTeamsError);
  }

  let fantasyPicksRaw: { team_id: string; member_id: string; slot: string }[] =
    [];
  if (fantasyTeamsRaw && fantasyTeamsRaw.length > 0) {
    const { data: picks, error: fantasyPicksError } = await supabase
      .from("fantasy_picks")
      .select("team_id, member_id, slot")
      .in(
        "team_id",
        fantasyTeamsRaw.map((team) => team.id)
      );

    if (fantasyPicksError) {
      console.error("Error fetching fantasy_picks:", fantasyPicksError);
    }
    fantasyPicksRaw = picks ?? [];
  }

  // Info de todos los miembros involucrados
  const allMemberIds = new Set<string>();
  for (const a of asistencias ?? []) allMemberIds.add(a.member_id);
  for (const s of scoresRaw ?? []) allMemberIds.add(s.member_id);
  for (const d of dtScoresRaw ?? []) allMemberIds.add(d.dt_member_id);
  for (const w of winsRaw ?? []) allMemberIds.add(w.member_id);
  for (const p of fantasyPicksRaw) allMemberIds.add(p.member_id);

  const { data: miembrosRaw } = await supabase
    .from("group_members")
    .select("id, display_name, user_id, status")
    .in("id", Array.from(allMemberIds));

  const userIds = (miembrosRaw ?? [])
    .map((m) => m.user_id)
    .filter((x): x is string => !!x);

  let perfiles: Record<
    string,
    { real_name: string | null; photo_url: string | null }
  > = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, real_name, photo_url")
      .in("id", userIds);
    perfiles = Object.fromEntries(
      (profs ?? []).map((p) => [
        p.id,
        { real_name: p.real_name, photo_url: p.photo_url },
      ])
    );
  }

  const miembrosMap = new Map(
    (miembrosRaw ?? []).map((m) => [
      m.id,
      {
        alias: m.display_name,
        real_name:
          m.user_id ? perfiles[m.user_id]?.real_name ?? "" : "",
        is_invitado: m.status === "invitado",
        photo_url: m.user_id ? perfiles[m.user_id]?.photo_url ?? null : null,
      },
    ])
  );

   // Jugadores con puntaje (incluyendo los que hicieron 0)
  const jugadores: JugadorResultado[] = (asistencias ?? [])
    .map((a) => {
      const m = miembrosMap.get(a.member_id);
      return {
        member_id: a.member_id,
        alias: m?.alias ?? "—",
        real_name: m?.real_name.trim() ?? "",
        photo_url: m?.photo_url ?? null,
        is_invitado: m?.is_invitado ?? false,
        points: scoresMap.get(a.member_id) ?? 0,
        items: itemsPorJugador.get(a.member_id) ?? [],
      };
    })
    .sort((a, b) => b.points - a.points);

  // DTs con puntaje
  const picksPorTeam = new Map<
    string,
    { member_id: string; slot: string }[]
  >();
  for (const pick of fantasyPicksRaw) {
    if (!picksPorTeam.has(pick.team_id)) picksPorTeam.set(pick.team_id, []);
    picksPorTeam.get(pick.team_id)!.push({
      member_id: pick.member_id,
      slot: pick.slot,
    });
  }

  const teamPorDT = new Map(
    (fantasyTeamsRaw ?? []).map((team) => [team.dt_member_id, team])
  );
  const mapJugadorEquipo = (memberId: string): JugadorEquipoDT => {
    const miembro = miembrosMap.get(memberId);
    return {
      member_id: memberId,
      alias: miembro?.alias ?? "—",
      real_name: miembro?.real_name.trim() ?? "",
      photo_url: miembro?.photo_url ?? null,
      points: scoresMap.get(memberId) ?? 0,
      items: itemsPorJugador.get(memberId) ?? [],
    };
  };

  const dts: DTResultado[] = (dtScoresRaw ?? []).map((d) => {
    const m = miembrosMap.get(d.dt_member_id);
    const nombreReal = m?.real_name ?? "";
    const team = teamPorDT.get(d.dt_member_id);
    const picks = team ? picksPorTeam.get(team.id) ?? [] : [];
    const points = team
      ? calcularPuntajeDT(
          picks.map((pick) => ({
            slot: pick.slot,
            points: scoresMap.get(pick.member_id) ?? 0,
          }))
        )
      : d.points;
    const suplentePick = picks.find((pick) => pick.slot === "suplente");
    return {
      member_id: d.dt_member_id,
      real_name: nombreReal.trim(),
      alias: m?.alias ?? "—",
      photo_url: m?.photo_url ?? null,
      points,
      picks_count: picks.length,
      equipo: {
        titulares: picks
          .filter((pick) => pick.slot === "titular")
          .map((pick) => mapJugadorEquipo(pick.member_id)),
        suplente: suplentePick
          ? mapJugadorEquipo(suplentePick.member_id)
          : null,
      },
    };
  }).sort((a, b) => b.points - a.points);

  // Equipo Ideal = top (cupo/2) jugadores
  const equipoIdealCount = Math.floor(partidoActual.cupo / 2);
  const equipoIdeal = jugadores.slice(0, equipoIdealCount);

  // DT de la fecha
  const dtDeLaFecha = dts[0] ?? null;

  const partidosResumen: PartidoResumen[] = partidos.map((p) => ({
    id: p.id,
    number: p.number,
    kickoff_at: p.kickoff_at,
    place: p.place,
    cupo: p.cupo,
  }));

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <h1 className="bebas text-3xl">Resultados</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          {season.name}
        </p>
      </header>

      <ResultadosClient
        partidos={partidosResumen}
        partidoActual={partidoActual}
        dtDeLaFecha={dtDeLaFecha}
        equipoIdeal={equipoIdeal}
        jugadores={jugadores}
        dts={dts}
      />

      <div className="h-8" />
    </div>
  );
}