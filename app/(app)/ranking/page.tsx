import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RankingClient from "./RankingClient";

export type FechaLite = {
  id: string;
  number: number;
  kickoff_at: string;
};

export type JugadorEnFecha = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  points: number;
};

export type EquipoDTFecha = {
  match_id: string;
  match_number: number;
  kickoff_at: string;
  points: number;
  titulares: JugadorEnFecha[];
  suplente: JugadorEnFecha | null;
};

export type DTRanking = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  is_me: boolean;
  total_points: number;
  estrellas: number;
  equipos: EquipoDTFecha[];
};

export type PuntosItemJugador = {
  label: string;
  points: number;
};

export type ResultadoFechaJugador = {
  match_id: string;
  match_number: number;
  kickoff_at: string;
  points: number;
  items: PuntosItemJugador[];
};

export type JugadorRanking = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  is_invitado: boolean;
  is_me: boolean;
  total_points: number;
  estrellas: number;
  tarjetas: number;
  por_item: Record<string, number>;
  por_fecha: ResultadoFechaJugador[];
};

export type ItemInfo = {
  id: string;
  key: string;
  label: string;
  points: number;
};

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("id, group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Ranking</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No estás activo en el grupo.
        </p>
      </div>
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("group_id", membership.group_id)
    .eq("status", "activa")
    .maybeSingle();

  if (!season) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Ranking</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No hay temporada activa.
        </p>
      </div>
    );
  }

  const { data: grupo } = await supabase
    .from("groups")
    .select("equipo_ideal_anio_size")
    .eq("id", membership.group_id)
    .single();

  const equipoIdealAnioSize = grupo?.equipo_ideal_anio_size ?? 5;

  const { data: partidos } = await supabase
    .from("matches")
    .select("id, number, kickoff_at")
    .eq("season_id", season.id)
    .in("status", ["jugada", "cerrada"])
    .order("number", { ascending: true });

  const partidosIds = (partidos ?? []).map((p) => p.id);

  const { data: items } = await supabase
    .from("items")
    .select("id, key, label, points")
    .eq("group_id", membership.group_id)
    .eq("active", true)
    .order("sort_order");

  const itemsList: ItemInfo[] = (items ?? []).map((i) => ({
    id: i.id,
    key: i.key,
    label: i.label,
    points: i.points,
  }));

  const { data: miembros } = await supabase
    .from("group_members")
    .select("id, display_name, user_id, status, role")
    .eq("group_id", membership.group_id)
    .in("status", ["activo", "invitado", "suspendido"])
    .order("display_name");

  const userIds = (miembros ?? [])
    .map((m) => m.user_id)
    .filter((x): x is string => !!x);

  let perfiles: Record<string, { photo_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, photo_url")
      .in("id", userIds);
    perfiles = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, { photo_url: p.photo_url }])
    );
  }

  const miembrosMap = new Map(
    (miembros ?? []).map((m) => [
      m.id,
      {
        alias: m.display_name,
        is_invitado: m.status === "invitado",
        is_admin: m.role === "admin",
        photo_url: m.user_id ? perfiles[m.user_id]?.photo_url ?? null : null,
      },
    ])
  );

  // ─── Scores ───
  let dtScores: { dt_member_id: string; points: number; match_id: string }[] = [];
  let playerScores: { member_id: string; points: number; match_id: string }[] = [];
  let itemWins: { member_id: string; item_id: string; match_id: string }[] = [];
  let cardsRaw: { member_id: string; match_id: string }[] = [];

  if (partidosIds.length > 0) {
    const [a, b, c, d] = await Promise.all([
      supabase.from("dt_scores").select("dt_member_id, points, match_id").in("match_id", partidosIds),
      supabase.from("player_scores").select("member_id, points, match_id").in("match_id", partidosIds),
      supabase.from("match_item_wins").select("member_id, item_id, match_id").in("match_id", partidosIds),
      supabase.from("cards").select("member_id, match_id").in("match_id", partidosIds).eq("annulled", false),
    ]);
    dtScores = a.data ?? [];
    playerScores = b.data ?? [];
    itemWins = c.data ?? [];
    cardsRaw = d.data ?? [];
  }

    // ─── Equipos (fantasy_teams + picks) por fecha ───
  // Hacemos 2 queries separadas para evitar problemas con el join anidado
  let fantasyData: {
    match_id: string;
    dt_member_id: string;
    fantasy_picks: { member_id: string; slot: string }[];
  }[] = [];

  if (partidosIds.length > 0) {
    const { data: teams, error: errTeams } = await supabase
      .from("fantasy_teams")
      .select("id, match_id, dt_member_id")
      .in("match_id", partidosIds);

    if (errTeams) {
      console.error("Error fetching fantasy_teams:", errTeams);
    }

    if (teams && teams.length > 0) {
      const teamIds = teams.map((t) => t.id);
      const { data: picks, error: errPicks } = await supabase
        .from("fantasy_picks")
        .select("team_id, member_id, slot")
        .in("team_id", teamIds);

      if (errPicks) {
        console.error("Error fetching fantasy_picks:", errPicks);
      }

      const picksPorTeam = new Map<
        string,
        { member_id: string; slot: string }[]
      >();
      for (const p of picks ?? []) {
        if (!picksPorTeam.has(p.team_id)) picksPorTeam.set(p.team_id, []);
        picksPorTeam.get(p.team_id)!.push({ member_id: p.member_id, slot: p.slot });
      }

      fantasyData = teams.map((t) => ({
        match_id: t.match_id,
        dt_member_id: t.dt_member_id,
        fantasy_picks: picksPorTeam.get(t.id) ?? [],
      }));
    }
  }

  // ─── Estrellas DT: cuántas veces fue DT de la fecha ───
  // Calculamos por fecha quién fue el que más puntos sacó.
  const maxPointsPorFecha = new Map<string, number>();
  for (const s of dtScores) {
    const actual = maxPointsPorFecha.get(s.match_id) ?? -Infinity;
    if (s.points > actual) maxPointsPorFecha.set(s.match_id, s.points);
  }
  const estrellasDTMap = new Map<string, number>();
  for (const s of dtScores) {
    if (s.points > 0 && s.points === maxPointsPorFecha.get(s.match_id)) {
      estrellasDTMap.set(s.dt_member_id, (estrellasDTMap.get(s.dt_member_id) ?? 0) + 1);
    }
  }

  // ─── Estrellas Jugador: cuántas veces entró al Equipo Ideal de la fecha ───
  // Se calcula por fecha: top (cupo/2) jugadores con más puntos
  const { data: partidosFull } = await supabase
    .from("matches")
    .select("id, number, cupo")
    .eq("season_id", season.id)
    .in("status", ["jugada", "cerrada"]);
  const cupoPorMatch = new Map((partidosFull ?? []).map((p) => [p.id, p.cupo]));

  const scoresPorFecha = new Map<string, { member_id: string; points: number }[]>();
  for (const s of playerScores) {
    if (!scoresPorFecha.has(s.match_id)) scoresPorFecha.set(s.match_id, []);
    scoresPorFecha.get(s.match_id)!.push({ member_id: s.member_id, points: s.points });
  }

  const estrellasJugadorMap = new Map<string, number>();
  for (const [mid, scores] of scoresPorFecha.entries()) {
    const cupo = cupoPorMatch.get(mid) ?? 10;
    const limite = Math.floor(cupo / 2);
    const ordenados = [...scores].sort((a, b) => b.points - a.points);
    const top = ordenados.slice(0, limite);
    for (const t of top) {
      if (t.points > 0) {
        estrellasJugadorMap.set(t.member_id, (estrellasJugadorMap.get(t.member_id) ?? 0) + 1);
      }
    }
  }

  // ─── Ranking DT ───
  const dtTotales = new Map<string, number>();
  for (const s of dtScores) {
    dtTotales.set(s.dt_member_id, (dtTotales.get(s.dt_member_id) ?? 0) + s.points);
  }

  const equiposPorDT = new Map<string, EquipoDTFecha[]>();
  const scoresJugadorPorMatch = new Map<string, Map<string, number>>();
  for (const s of playerScores) {
    if (!scoresJugadorPorMatch.has(s.match_id)) {
      scoresJugadorPorMatch.set(s.match_id, new Map());
    }
    scoresJugadorPorMatch.get(s.match_id)!.set(s.member_id, s.points);
  }

  for (const f of fantasyData) {
    const partido = (partidosFull ?? []).find((p) => p.id === f.match_id);
    if (!partido) continue;

    const puntosMap = scoresJugadorPorMatch.get(f.match_id) ?? new Map();
    const dtPuntos = dtScores.find(
      (d) => d.match_id === f.match_id && d.dt_member_id === f.dt_member_id
    )?.points ?? 0;

    const titulares: JugadorEnFecha[] = f.fantasy_picks
      .filter((p) => p.slot === "titular")
      .map((p) => {
        const mm = miembrosMap.get(p.member_id);
        return {
          member_id: p.member_id,
          alias: mm?.alias ?? "—",
          photo_url: mm?.photo_url ?? null,
          points: puntosMap.get(p.member_id) ?? 0,
        };
      });

    const suplentePick = f.fantasy_picks.find((p) => p.slot === "suplente");
    const suplente: JugadorEnFecha | null = suplentePick
      ? (() => {
          const mm = miembrosMap.get(suplentePick.member_id);
          return {
            member_id: suplentePick.member_id,
            alias: mm?.alias ?? "—",
            photo_url: mm?.photo_url ?? null,
            points: puntosMap.get(suplentePick.member_id) ?? 0,
          };
        })()
      : null;

    if (!equiposPorDT.has(f.dt_member_id)) equiposPorDT.set(f.dt_member_id, []);
    equiposPorDT.get(f.dt_member_id)!.push({
      match_id: f.match_id,
      match_number: partido.number,
      kickoff_at: "",
      points: dtPuntos,
      titulares,
      suplente,
    });
  }

  // Ordenar equipos por fecha
  for (const arr of equiposPorDT.values()) {
    arr.sort((a, b) => a.match_number - b.match_number);
  }

  const rankingDTBase = (miembros ?? [])
    .filter((m) => m.user_id !== null && m.status === "activo")
    .map((m) => {
      const info = miembrosMap.get(m.id);
      return {
        member_id: m.id,
        alias: info?.alias ?? "—",
        photo_url: info?.photo_url ?? null,
        is_me: m.id === membership.id,
        total_points: dtTotales.get(m.id) ?? 0,
        estrellas: estrellasDTMap.get(m.id) ?? 0,
        equipos: equiposPorDT.get(m.id) ?? [],
      };
    })
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return a.alias.localeCompare(b.alias);
    });

  // ─── Ranking Jugadores ───
  const itemsPorId = new Map(itemsList.map((i) => [i.id, i]));

  const jugadorTotales = new Map<string, number>();
  const jugadorPorItem = new Map<string, Record<string, number>>();
  const jugadorPorFecha = new Map<
    string,
    Map<string, { points: number; items: PuntosItemJugador[] }>
  >();

  for (const w of itemWins) {
    const item = itemsPorId.get(w.item_id);
    if (!item) continue;
    jugadorTotales.set(w.member_id, (jugadorTotales.get(w.member_id) ?? 0) + item.points);
    if (!jugadorPorItem.has(w.member_id)) jugadorPorItem.set(w.member_id, {});
    const porItem = jugadorPorItem.get(w.member_id)!;
    porItem[item.key] = (porItem[item.key] ?? 0) + item.points;

    if (!jugadorPorFecha.has(w.member_id)) jugadorPorFecha.set(w.member_id, new Map());
    const porFecha = jugadorPorFecha.get(w.member_id)!;
    const actual = porFecha.get(w.match_id) ?? { points: 0, items: [] };
    actual.points += item.points;
    actual.items.push({ label: item.label, points: item.points });
    porFecha.set(w.match_id, actual);
  }

  const tarjetasMap = new Map<string, number>();
  for (const c of cardsRaw) {
    tarjetasMap.set(c.member_id, (tarjetasMap.get(c.member_id) ?? 0) + 1);
  }

  const partidosMap = new Map(
    (partidosFull ?? []).map((p) => [p.id, p])
  );

  const rankingJugadores: JugadorRanking[] = (miembros ?? [])
    .map((m) => {
      const info = miembrosMap.get(m.id);
      const porFecha = jugadorPorFecha.get(m.id) ?? new Map();
      const fechas: ResultadoFechaJugador[] = [];
      for (const [mid, data] of porFecha.entries()) {
        const p = partidosMap.get(mid);
        if (!p) continue;
        fechas.push({
          match_id: mid,
          match_number: p.number,
          kickoff_at: "",
          points: data.points,
          items: data.items,
        });
      }
      fechas.sort((a, b) => a.match_number - b.match_number);

      return {
        member_id: m.id,
        alias: info?.alias ?? "—",
        photo_url: info?.photo_url ?? null,
        is_invitado: info?.is_invitado ?? false,
        is_me: m.id === membership.id,
        total_points: jugadorTotales.get(m.id) ?? 0,
        estrellas: estrellasJugadorMap.get(m.id) ?? 0,
        tarjetas: tarjetasMap.get(m.id) ?? 0,
        por_item: jugadorPorItem.get(m.id) ?? {},
        por_fecha: fechas,
      };
    })
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (a.tarjetas !== b.tarjetas) return a.tarjetas - b.tarjetas;
      return a.alias.localeCompare(b.alias);
    });

  // Equipo Ideal del Año
  const equipoIdealAnio = rankingJugadores
    .filter((j) => j.total_points > 0)
    .slice(0, equipoIdealAnioSize);

  // DT del año (el que más puntos tiene)
  const dtDelAnio = rankingDTBase[0] ?? null;

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <h1 className="bebas text-3xl">Ranking</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          {season.name} · Tabla general
        </p>
      </header>

      <RankingClient
        rankingDT={rankingDTBase}
        rankingJugadores={rankingJugadores}
        equipoIdealAnio={equipoIdealAnio}
        dtDelAnio={dtDelAnio}
        items={itemsList}
      />

      <div className="h-8" />
    </div>
  );
}