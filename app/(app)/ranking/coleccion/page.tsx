import Link from "next/link";
import { getCurrentGroupMembership } from "@/lib/group-context";
import { formatearFechaCortaAR } from "@/lib/fecha";
import { calcularPuntajeDT } from "@/lib/puntaje-dt";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ColeccionClient, { type FechaColeccion } from "./ColeccionClient";

export default async function ColeccionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentGroupMembership(supabase, user.id, [
    "activo",
  ]);
  if (!membership) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Colección de cartas</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No estás activo en el grupo.
        </p>
      </div>
    );
  }

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, number, kickoff_at, season_id")
    .eq("group_id", membership.group_id)
    .in("status", ["jugada", "cerrada"])
    .order("kickoff_at", { ascending: false });

  if (matchesError) {
    console.error("Could not load matches for DT card collection:", matchesError);
    return <CollectionError />;
  }
  if (!matches?.length) return <CollectionEmpty />;

  const matchIds = matches.map((match) => match.id);
  const seasonIds = [...new Set(matches.map((match) => match.season_id))];
  const [
    { data: seasons, error: seasonsError },
    { data: teams, error: teamsError },
    { data: playerScores, error: playerScoresError },
    { data: dtScores, error: dtScoresError },
  ] =
    await Promise.all([
      supabase
        .from("seasons")
        .select("id, name")
        .eq("group_id", membership.group_id)
        .in("id", seasonIds),
      supabase
        .from("fantasy_teams")
        .select("id, match_id, dt_member_id")
        .in("match_id", matchIds),
      supabase
        .from("player_scores")
        .select("match_id, member_id, points")
        .in("match_id", matchIds),
      supabase
        .from("dt_scores")
        .select("match_id, dt_member_id, points")
        .in("match_id", matchIds),
    ]);

  if (seasonsError || teamsError || playerScoresError || dtScoresError) {
    console.error("Could not load data for DT card collection:", {
      seasons: seasonsError,
      teams: teamsError,
      playerScores: playerScoresError,
      dtScores: dtScoresError,
    });
    return <CollectionError />;
  }

  const teamIds = (teams ?? []).map((team) => team.id);
  const { data: picks, error: picksError } =
    teamIds.length > 0
      ? await supabase
          .from("fantasy_picks")
          .select("team_id, member_id, slot")
          .in("team_id", teamIds)
      : { data: [], error: null };
  if (picksError) {
    console.error("Could not load team picks for DT card collection:", picksError);
    return <CollectionError />;
  }

  const memberIds = [
    ...new Set([
      ...(teams ?? []).map((team) => team.dt_member_id),
      ...(dtScores ?? []).map((score) => score.dt_member_id),
      ...(picks ?? []).map((pick) => pick.member_id),
    ]),
  ];
  const { data: members, error: membersError } =
    memberIds.length > 0
      ? await supabase
          .from("group_members")
          .select("id, display_name")
          .eq("group_id", membership.group_id)
          .in("id", memberIds)
      : { data: [], error: null };
  if (membersError) {
    console.error("Could not load DT names for card collection:", membersError);
    return <CollectionError />;
  }

  const seasonNames = new Map(
    (seasons ?? []).map((season) => [season.id, season.name])
  );
  const memberNames = new Map(
    (members ?? []).map((member) => [member.id, member.display_name])
  );
  const scoreByMatchMember = new Map(
    (playerScores ?? []).map((score) => [
      `${score.match_id}:${score.member_id}`,
      score.points,
    ])
  );
  const picksByTeam = new Map<string, { member_id: string; slot: string }[]>();
  for (const pick of picks ?? []) {
    if (!picksByTeam.has(pick.team_id)) picksByTeam.set(pick.team_id, []);
    picksByTeam.get(pick.team_id)!.push(pick);
  }
  const podiumsByMatch = new Map<
    string,
    { dt_member_id: string; points: number }[]
  >();
  for (const score of dtScores ?? []) {
    if (!podiumsByMatch.has(score.match_id)) {
      podiumsByMatch.set(score.match_id, []);
    }
    podiumsByMatch.get(score.match_id)!.push({
      dt_member_id: score.dt_member_id,
      points: score.points,
    });
  }
  for (const team of teams ?? []) {
    const teamPicks = picksByTeam.get(team.id) ?? [];
    const points = calcularPuntajeDT(
      teamPicks.map((pick) => ({
        slot: pick.slot,
        points:
          scoreByMatchMember.get(`${team.match_id}:${pick.member_id}`) ?? 0,
      }))
    );
    if (!podiumsByMatch.has(team.match_id)) {
      podiumsByMatch.set(team.match_id, []);
    }
    const podium = podiumsByMatch.get(team.match_id)!;
    const existing = podium.find(
      (score) => score.dt_member_id === team.dt_member_id
    );
    if (existing) existing.points = points;
    else podium.push({ dt_member_id: team.dt_member_id, points });
  }

  const files = matches.map((match) => ({
    match,
    path: `${membership.group_id}/${match.season_id}/${match.id}.pdf`,
  }));
  const { data: signedFiles, error: signedFilesError } = await supabase.storage
    .from("dt-card-archives")
    .createSignedUrls(
      files.map((file) => file.path),
      60 * 60 * 24
    );
  if (signedFilesError) {
    console.error("Could not create links for archived DT card PDFs:", signedFilesError);
  }
  const signedUrlByPath = new Map(
    (signedFiles ?? []).map((file) => [file.path, file.signedUrl ?? null])
  );

  const fechas: FechaColeccion[] = files.flatMap(({ match, path }) => {
    const podio = (podiumsByMatch.get(match.id) ?? [])
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((score, index) => ({
        posicion: (index + 1) as 1 | 2 | 3,
        alias: memberNames.get(score.dt_member_id) ?? "—",
        points: score.points,
      }));
    if (podio.length === 0) return [];
    return [
      {
        matchId: match.id,
        seasonId: match.season_id,
        seasonName: seasonNames.get(match.season_id) ?? "Temporada",
        fecha: match.number,
        fechaTexto: formatearFechaCortaAR(match.kickoff_at),
        kickoffAt: match.kickoff_at,
        podio,
        pdfUrl: signedUrlByPath.get(path) ?? null,
      },
    ];
  });

  const temporadas = [
    ...new Map(
      fechas.map((item) => [item.seasonId, item.seasonName])
    ).entries(),
  ].map(([id, name]) => ({ id, name }));

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <Link
          href="/ranking"
          className="text-xs no-underline"
          style={{ color: "var(--dim)" }}
        >
          ← Volver al ranking
        </Link>
        <h1 className="bebas mt-2 text-3xl">Colección de cartas</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Los DT ganadores de cada fecha, temporada por temporada.
        </p>
      </header>
      <ColeccionClient
        fechas={fechas}
        temporadas={temporadas}
        esAdmin={membership.role === "admin"}
      />
      <div className="h-8" />
    </div>
  );
}

function CollectionError() {
  return (
    <div className="mx-3 mt-4 rounded-xl p-4 text-sm" style={{ background: "var(--g1)" }}>
      No se pudo cargar la colección. Intentá nuevamente.
    </div>
  );
}

function CollectionEmpty() {
  return (
    <div className="mx-3 mt-4 rounded-xl p-5 text-center" style={{ background: "var(--g1)" }}>
      <div className="text-3xl">🏅</div>
      <p className="bebas mt-2 text-xl">Todavía no hay cartas</p>
      <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
        Cuando se carguen resultados, los podios aparecerán acá.
      </p>
    </div>
  );
}
