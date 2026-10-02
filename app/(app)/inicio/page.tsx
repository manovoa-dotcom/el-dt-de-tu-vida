import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import BotonAnotarse from "./BotonAnotarse";
import NoticiaForm from "./NoticiaForm";
import NoticiaCard from "./NoticiaCard";
import MarcarComoLeidas from "./MarcarComoLeidas";
import {
  formatearFechaAR,
  formatearHoraAR,
  DIAS_SEMANA,
  MESES_CORTOS,
} from "@/lib/fecha";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select(`
      id,
      display_name,
      role,
      status,
      group:groups (id, name, slug)
    `)
    .eq("user_id", user.id)
    .in("status", ["activo", "pendiente"])
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.group) return null;

  const grupo = membership.group as unknown as {
    id: string;
    name: string;
    slug: string;
  };

  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("photo_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: proximo } = await supabase
    .from("matches")
    .select("id, number, kickoff_at, place, cupo, status, baja_closes_at")
    .eq("group_id", grupo.id)
    .eq("status", "programada")
    .gte("kickoff_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let anotadosCount = 0;
  let espera = 0;
  let miEstado: string | null = null;

  if (proximo) {
    const { count: countAnotados } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("match_id", proximo.id)
      .in("status", ["anotado", "presente"]);

    const { count: countEspera } = await supabase
      .from("attendance")
      .select("id", { count: "exact", head: true })
      .eq("match_id", proximo.id)
      .eq("status", "lista_espera");

    anotadosCount = countAnotados ?? 0;
    espera = countEspera ?? 0;

    const { data: miAsistencia } = await supabase
      .from("attendance")
      .select("status")
      .eq("match_id", proximo.id)
      .eq("member_id", membership.id)
      .maybeSingle();

    miEstado = miAsistencia?.status ?? null;
  }

  const { data: noticiasRaw } = await supabase
    .from("news")
    .select("id, kind, title, body, created_at, author_id")
    .eq("group_id", grupo.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const authorIds = (noticiasRaw ?? [])
    .map((n) => n.author_id)
    .filter((x): x is string => !!x);

  let autores: Record<string, { alias: string; photo: string | null }> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, photo_url, display_name")
      .in("id", authorIds);
    autores = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, { alias: p.display_name, photo: p.photo_url }])
    );
  }

  const newsIds = (noticiasRaw ?? []).map((n) => n.id);
  let reaccionesRaw: { news_id: string; member_id: string; emoji: string }[] = [];
  if (newsIds.length > 0) {
    const { data: reacs } = await supabase
      .from("reactions")
      .select("news_id, member_id, emoji")
      .in("news_id", newsIds);
    reaccionesRaw = reacs ?? [];
  }

  const reaccionesPorNoticia = new Map<
    string,
    Map<string, { cantidad: number; yo: boolean }>
  >();
  for (const r of reaccionesRaw) {
    if (!reaccionesPorNoticia.has(r.news_id)) {
      reaccionesPorNoticia.set(r.news_id, new Map());
    }
    const mapa = reaccionesPorNoticia.get(r.news_id)!;
    const actual = mapa.get(r.emoji) ?? { cantidad: 0, yo: false };
    actual.cantidad++;
    if (r.member_id === membership.id) actual.yo = true;
    mapa.set(r.emoji, actual);
  }

  const noticias = (noticiasRaw ?? []).map((n) => {
    const mapa = reaccionesPorNoticia.get(n.id) ?? new Map();
    const reacciones = ["🔥", "😂", "👏"].map((emoji) => {
      const r = mapa.get(emoji);
      return {
        emoji,
        cantidad: r?.cantidad ?? 0,
        yo_reaccione: r?.yo ?? false,
      };
    });

    const autor = n.author_id ? autores[n.author_id] : null;

    return {
      id: n.id,
      kind: n.kind as "auto" | "usuario",
      titulo: n.title,
      cuerpo: n.body,
      authorAlias: autor?.alias ?? null,
      authorPhoto: autor?.photo ?? null,
      createdAt: n.created_at,
      reacciones,
    };
  });

  const isAdmin = membership.role === "admin";
  const bajaCerrada = proximo
    ? new Date() > new Date(proximo.baja_closes_at)
    : false;
  const completo = proximo ? anotadosCount >= proximo.cupo : false;

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <div className="flex items-start justify-between gap-3">
          <Link
            href="/perfil"
            className="flex min-w-0 items-start gap-3 no-underline"
            style={{ color: "var(--tx)" }}
          >
            <Avatar
              alias={membership.display_name}
              photoUrl={miPerfil?.photo_url ?? null}
              size={48}
            />
            <div className="min-w-0">
              <h1 className="bebas text-3xl leading-tight">
                Hola, {membership.display_name}
              </h1>
              <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
                {grupo.name}
                {proximo ? ` · Fecha ${proximo.number}` : " · Sin fecha programada"}
              </p>
            </div>
          </Link>
        </div>
                <div className="mt-2 flex items-center gap-4">
          <Link
            href="/como-se-juega"
            className="inline-flex items-center gap-1 text-xs no-underline"
            style={{ color: "var(--gold)" }}
          >
            ❓ Cómo se juega
          </Link>
          <Link
            href="/config/correcciones"
            className="inline-flex items-center gap-1 text-xs no-underline"
            style={{ color: "var(--dim)" }}
          >
            📋 Historial
          </Link>
        </div>
      </header>

      {proximo ? (
        <div
          className="mx-3 mt-3 rounded-2xl p-4"
          style={{
            background: "linear-gradient(160deg, #1b4f39, #11352a)",
            border: "1px solid var(--gold)",
            color: "var(--tx)",
          }}
        >
          <div
            className="bebas text-xs tracking-widest"
            style={{ color: "var(--gold)" }}
          >
            PRÓXIMO PARTIDO · FECHA {proximo.number}
          </div>
          <div className="bebas mt-1 text-3xl">
            {DIAS_SEMANA[formatearFechaAR(proximo.kickoff_at).diaSemana]}{" "}
            {formatearFechaAR(proximo.kickoff_at).dia}{" "}
            {MESES_CORTOS[formatearFechaAR(proximo.kickoff_at).mes]} ·{" "}
            {formatearHoraAR(proximo.kickoff_at)}
          </div>
          {proximo.place && (
            <div className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
              📍 {proximo.place}
            </div>
          )}

          <div
            className="my-2 h-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="h-full rounded-full transition"
              style={{
                background: completo ? "var(--or)" : "var(--gold)",
                width: `${Math.min(100, (anotadosCount / proximo.cupo) * 100)}%`,
              }}
            />
          </div>

          <BotonAnotarse
            matchId={proximo.id}
            miEstado={miEstado}
            cupo={proximo.cupo}
            anotadosCount={anotadosCount}
            bajaCerrada={bajaCerrada}
            completo={completo}
          />

          {espera > 0 && (
            <div
              className="mt-2 text-center text-[10px]"
              style={{ color: "var(--dim)" }}
            >
              Lista de espera: {espera}
            </div>
          )}
        </div>
      ) : (
        <div
          className="mx-3 mt-3 rounded-2xl p-5 text-center"
          style={{
            background: "var(--g1)",
            border: "1px dashed rgba(255,255,255,0.15)",
          }}
        >
          <div className="text-3xl">📅</div>
          <p className="bebas mt-2 text-xl">No hay partido programado</p>
          {isAdmin ? (
            <>
              <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
                Cargá la próxima fecha desde Config.
              </p>
              <Link
                href="/config"
                className="mt-3 inline-block rounded-xl px-4 py-2 text-sm font-bold no-underline"
                style={{ background: "var(--or)", color: "#fff" }}
              >
                Ir a Config
              </Link>
            </>
          ) : (
            <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
              El admin todavía no cargó la próxima fecha.
            </p>
          )}
        </div>
      )}

      <div className="bebas mt-6 px-4 text-2xl tracking-wider">
        EL DT DE TU VIDA INFORMA
      </div>
      <p className="px-4 text-xs" style={{ color: "var(--dim)" }}>
        Novedades del grupo
      </p>

      <NoticiaForm />

      {noticias.length > 0 ? (
        noticias.map((n) => (
          <NoticiaCard
            key={n.id}
            newsId={n.id}
            kind={n.kind}
            titulo={n.titulo}
            cuerpo={n.cuerpo}
            authorAlias={n.authorAlias}
            authorPhoto={n.authorPhoto}
            createdAt={n.createdAt}
            reacciones={n.reacciones}
          />
        ))
      ) : (
        <div
          className="mx-3 mt-3 rounded-2xl p-5 text-center text-sm"
          style={{ background: "var(--g1)", color: "var(--dim)" }}
        >
          Todavía no hay novedades.
        </div>
      )}

      <div className="h-8" />

      <MarcarComoLeidas />
    </div>
  );
}