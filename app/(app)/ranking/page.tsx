import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import RankingClient from "./RankingClient";

export type DTRanking = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  is_me: boolean;
  total_points: number;
  fechas_jugadas: number;
};

export type JugadorRanking = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  is_invitado: boolean;
  is_me: boolean;
  total_points: number;
  por_item: Record<string, number>;
  tarjetas: number;
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
        <h1 className="bebas text-3xl">Ranking</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No hay temporada activa.
        </p>
      </div>
    );
  }

  // Todos los partidos de la temporada
  const { data: partidos } = await supabase
    .from("matches")
    .select("id, number")
    .eq("season_id", season.id);

  const partidosIds = (partidos ?? []).map((p) => p.id);

  // Items activos
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

  // Todos los miembros del grupo
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

  // ─── RANKING DT ───
  let dtScores: { dt_member_id: string; points: number; match_id: string }[] = [];
  if (partidosIds.length > 0) {
    const { data } = await supabase
      .from("dt_scores")
      .select("dt_member_id, points, match_id")
      .in("match_id", partidosIds);
    dtScores = data ?? [];
  }

  const dtMap = new Map<string, { total: number; fechas: Set<string> }>();
  for (const s of dtScores) {
    if (!dtMap.has(s.dt_member_id)) {
      dtMap.set(s.dt_member_id, { total: 0, fechas: new Set() });
    }
    const entry = dtMap.get(s.dt_member_id)!;
    entry.total += s.points;
    entry.fechas.add(s.match_id);
  }

   // Ranking DT: TODOS los usuarios con cuenta (no invitados sin cuenta)
  const rankingDT: DTRanking[] = (miembros ?? [])
    .filter((m) => m.user_id !== null && m.status === "activo")
    .map((m) => {
      const data = dtMap.get(m.id);
      const info = miembrosMap.get(m.id);
      return {
        member_id: m.id,
        alias: info?.alias ?? "—",
        photo_url: info?.photo_url ?? null,
        is_me: m.id === membership.id,
        total_points: data?.total ?? 0,
        fechas_jugadas: data?.fechas.size ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return a.alias.localeCompare(b.alias);
    });

  // ─── RANKING JUGADORES ───
  let itemWins: { member_id: string; item_id: string; match_id: string }[] = [];
  if (partidosIds.length > 0) {
    const { data } = await supabase
      .from("match_item_wins")
      .select("member_id, item_id, match_id")
      .in("match_id", partidosIds);
    itemWins = data ?? [];
  }

  const itemsPorId = new Map(itemsList.map((i) => [i.id, i]));

  const jugadorMap = new Map<string, { total: number; por_item: Record<string, number> }>();
  for (const w of itemWins) {
    const item = itemsPorId.get(w.item_id);
    if (!item) continue;
    if (!jugadorMap.has(w.member_id)) {
      jugadorMap.set(w.member_id, { total: 0, por_item: {} });
    }
    const entry = jugadorMap.get(w.member_id)!;
    entry.total += item.points;
    entry.por_item[item.key] = (entry.por_item[item.key] ?? 0) + item.points;
  }

  // Tarjetas rojas
  let cardsRaw: { member_id: string; match_id: string }[] = [];
  if (partidosIds.length > 0) {
    const { data } = await supabase
      .from("cards")
      .select("member_id, match_id")
      .in("match_id", partidosIds)
      .eq("annulled", false);
    cardsRaw = data ?? [];
  }
  const tarjetasMap = new Map<string, number>();
  for (const c of cardsRaw) {
    tarjetasMap.set(c.member_id, (tarjetasMap.get(c.member_id) ?? 0) + 1);
  }

  // Ranking jugadores: TODOS los miembros (activos, invitados, suspendidos)
  const rankingJugadores: JugadorRanking[] = (miembros ?? [])
    .map((m) => {
      const data = jugadorMap.get(m.id);
      const info = miembrosMap.get(m.id);
      return {
        member_id: m.id,
        alias: info?.alias ?? "—",
        photo_url: info?.photo_url ?? null,
        is_invitado: info?.is_invitado ?? false,
        is_me: m.id === membership.id,
        total_points: data?.total ?? 0,
        por_item: data?.por_item ?? {},
        tarjetas: tarjetasMap.get(m.id) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (a.tarjetas !== b.tarjetas) return a.tarjetas - b.tarjetas;
      return a.alias.localeCompare(b.alias);
    });
  // Equipo Ideal del año: top (último cupo / 2) jugadores por puntos
  const { data: ultimoPartido } = await supabase
    .from("matches")
    .select("cupo")
    .eq("season_id", season.id)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cupoRef = ultimoPartido?.cupo ?? 10;
  const equipoIdealAnio = rankingJugadores.slice(0, Math.floor(cupoRef / 2));

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <h1 className="bebas text-3xl">Ranking</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          {season.name}
        </p>
      </header>

      <RankingClient
        rankingDT={rankingDT}
        rankingJugadores={rankingJugadores}
        equipoIdealAnio={equipoIdealAnio}
        items={itemsList}
      />

      <div className="h-8" />
    </div>
  );
}