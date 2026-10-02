import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ResultadosClient from "./ResultadosClient";
import {
  formatearFechaAR,
  formatearHoraAR,
  DIAS_SEMANA,
  MESES_LARGOS,
} from "@/lib/fecha";

export default async function CargarResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Resultados</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede cargar resultados.
        </p>
      </div>
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "activa")
    .maybeSingle();

  if (!season) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Cargar resultados</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No hay temporada activa.
        </p>
      </div>
    );
  }

  const { data: todosPartidos } = await supabase
    .from("matches")
    .select("id, number, kickoff_at, place, cupo, status")
    .eq("season_id", season.id)
    .order("number", { ascending: true });

  const partidos = todosPartidos ?? [];

  if (partidos.length === 0) {
    return (
      <div>
        <header className="px-4 pb-2 pt-6">
          <Link
            href="/config"
            className="text-xs no-underline"
            style={{ color: "var(--dim)" }}
          >
            ← Config
          </Link>
          <h1 className="bebas mt-2 text-3xl">Cargar resultados</h1>
        </header>
        <div
          className="mx-3 mt-3 rounded-2xl p-6 text-center"
          style={{ background: "var(--g1)", border: "1px dashed rgba(255,255,255,0.15)" }}
        >
          <div className="text-4xl">📝</div>
          <p className="bebas mt-3 text-xl">Sin partidos</p>
          <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
            Cargá el primer partido desde Config → Próximo partido.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const fechaQuery = params.fecha ? parseInt(params.fecha, 10) : null;
  const nowIso = new Date().toISOString();

  let match: (typeof partidos)[number] | null = null;
  let isEditing = false;
  let partidoNoJugado: (typeof partidos)[number] | null = null;

  // Si viene ?fecha=N
  if (fechaQuery) {
    const encontrado = partidos.find((p) => p.number === fechaQuery);
    if (encontrado) {
      if (encontrado.status === "jugada" || encontrado.status === "cerrada") {
        match = encontrado;
        isEditing = true;
      } else if (encontrado.status === "programada") {
        if (encontrado.kickoff_at < nowIso) {
          match = encontrado;
        } else {
          // El partido todavía no se jugó
          partidoNoJugado = encontrado;
        }
      }
    }
  }

  // Sin ?fecha=N, buscar automáticamente
  if (!match && !partidoNoJugado) {
    const pendiente = partidos.find(
      (p) => p.status === "programada" && p.kickoff_at < nowIso
    );
    if (pendiente) {
      match = pendiente;
    } else {
      const jugadas = partidos
        .filter((p) => p.status === "jugada" || p.status === "cerrada")
        .sort((a, b) => b.number - a.number);
      if (jugadas.length > 0) {
        match = jugadas[0];
        isEditing = true;
      }
    }
  }

  // Caso especial: el partido todavía no se jugó
  if (partidoNoJugado) {
    const kickoff = new Date(partidoNoJugado.kickoff_at);
    return (
      <div>
        <header className="px-4 pb-2 pt-6">
          <Link
            href="/config"
            className="text-xs no-underline"
            style={{ color: "var(--dim)" }}
          >
            ← Config
          </Link>
          <h1 className="bebas mt-2 text-3xl">Cargar resultados</h1>
        </header>
        <div
          className="mx-3 mt-3 rounded-2xl p-6 text-center"
          style={{
            background: "var(--g1)",
            border: "1px solid rgba(242,182,50,0.4)",
          }}
        >
          <div className="text-4xl">⏳</div>
          <p className="bebas mt-3 text-xl" style={{ color: "var(--gold)" }}>
            El partido todavía no se jugó
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--dim)" }}>
            Fecha {partidoNoJugado.number} ·{" "}
            {formatearFechaAR(partidoNoJugado.kickoff_at).dia}/
            {formatearFechaAR(partidoNoJugado.kickoff_at).mes + 1} ·{" "}
            {formatearHoraAR(partidoNoJugado.kickoff_at)} hs
          </p>
          <p className="mt-3 text-xs" style={{ color: "var(--tx)" }}>
            Vas a poder cargar los resultados después de la hora del partido.
          </p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div>
        <header className="px-4 pb-2 pt-6">
          <Link
            href="/config"
            className="text-xs no-underline"
            style={{ color: "var(--dim)" }}
          >
            ← Config
          </Link>
          <h1 className="bebas mt-2 text-3xl">Cargar resultados</h1>
        </header>
        <div
          className="mx-3 mt-3 rounded-2xl p-6 text-center"
          style={{ background: "var(--g1)", border: "1px dashed rgba(255,255,255,0.15)" }}
        >
          <div className="text-4xl">📝</div>
          <p className="bebas mt-3 text-xl">Sin partidos pendientes</p>
          <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
            Cuando termine el próximo partido, va a aparecer acá para cargar los
            resultados.
          </p>
        </div>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("items")
    .select("id, key, label, selection_type, points, sort_order")
    .eq("group_id", membership.group_id)
    .eq("active", true)
    .order("sort_order");

  const { data: asistencias } = await supabase
    .from("attendance")
    .select(
      `member_id, status,
       member:group_members (display_name, user_id, status)`
    )
    .eq("match_id", match.id)
    .in("status", ["anotado", "presente", "ausente_sin_aviso"]);

  const userIds = (asistencias ?? [])
    .map((a) => {
      const m = a.member as unknown as { user_id: string | null } | null;
      return m?.user_id;
    })
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

  const convocados = (asistencias ?? []).map((a) => {
    const m = a.member as unknown as {
      display_name: string;
      user_id: string | null;
      status: string;
    } | null;
    const uid = m?.user_id ?? null;
    return {
      member_id: a.member_id,
      alias: m?.display_name ?? "—",
      is_invitado: m?.status === "invitado",
      photo_url: uid ? perfiles[uid]?.photo_url ?? null : null,
    };
  });

  const { data: existingWins } = await supabase
    .from("match_item_wins")
    .select("item_id, member_id")
    .eq("match_id", match.id);

  const { data: existingCards } = await supabase
    .from("cards")
    .select("member_id")
    .eq("match_id", match.id)
    .eq("annulled", false);

  const existingFaltas = (existingCards ?? []).map((c) => c.member_id);

  const partidosSelector = partidos.map((p) => ({
    number: p.number,
    status: p.status,
    kickoff_at: p.kickoff_at,
  }));

  const fechaInfo = formatearFechaAR(match.kickoff_at);

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <Link
          href="/config"
          className="text-xs no-underline"
          style={{ color: "var(--dim)" }}
        >
          ← Config
        </Link>
        <h1 className="bebas mt-2 text-3xl">
          {isEditing ? `Editar Fecha ${match.number}` : `Cargar Fecha ${match.number}`}
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          {DIAS_SEMANA[fechaInfo.diaSemana].toLowerCase()} {fechaInfo.dia} de{" "}
          {MESES_LARGOS[fechaInfo.mes]}
          {match.place ? ` · ${match.place}` : ""}
        </p>
        {isEditing && (
          <p className="mt-2 text-xs" style={{ color: "var(--gold)" }}>
            ✏️ Estás editando una fecha ya cargada. Al guardar se recalculan los
            puntajes.
          </p>
        )}
      </header>

      <ResultadosClient
        key={match.id}
        matchId={match.id}
        partidoActual={{
          number: match.number,
          kickoff_at: match.kickoff_at,
          place: match.place,
        }}
        partidos={partidosSelector}
        items={items ?? []}
        convocados={convocados}
        existingWins={existingWins ?? []}
        existingFaltas={existingFaltas}
      />

      <div className="h-8" />
    </div>
  );
}