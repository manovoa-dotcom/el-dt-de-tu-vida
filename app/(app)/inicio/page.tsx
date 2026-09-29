import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import BotonAnotarse from "./BotonAnotarse";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

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

  if (!membership || !membership.group) {
    return null;
  }

  const grupo = membership.group as unknown as {
    id: string;
    name: string;
    slug: string;
  };

  // Foto del usuario
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("photo_url")
    .eq("id", user.id)
    .maybeSingle();
  const miPhotoUrl = miPerfil?.photo_url ?? null;

  // Próximo partido
  const { data: proximo } = await supabase
    .from("matches")
    .select("id, number, kickoff_at, place, cupo, status, baja_closes_at")
    .eq("group_id", grupo.id)
    .eq("status", "programada")
    .gte("kickoff_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Anotados y lista de espera del próximo partido
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

  // Noticias
  const { data: noticias } = await supabase
    .from("news")
    .select("id, kind, title, body, created_at")
    .eq("group_id", grupo.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const isAdmin = membership.role === "admin";
  const kickoff = proximo ? new Date(proximo.kickoff_at) : null;
  const bajaCerrada = proximo ? new Date() > new Date(proximo.baja_closes_at) : false;
  const completo = proximo ? anotadosCount >= proximo.cupo : false;

  return (
    <div>
      {/* Header con avatar → perfil */}
      <header className="px-4 pb-2 pt-6">
                <div className="flex items-start justify-between gap-3">
          <Link
            href="/perfil"
            className="flex min-w-0 items-start gap-3 no-underline"
            style={{ color: "var(--tx)" }}
          >
            <Avatar alias={membership.display_name} photoUrl={miPhotoUrl} size={48} />
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
        <Link
          href="/como-se-juega"
          className="mt-2 inline-flex items-center gap-1 text-xs no-underline"
          style={{ color: "var(--gold)" }}
        >
          ❓ Cómo se juega
        </Link>
      </header>

      {/* Próximo partido */}
      {proximo && kickoff ? (
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
            {DIAS[kickoff.getDay()]} {kickoff.getDate()} {MESES[kickoff.getMonth()]} ·{" "}
            {String(kickoff.getHours()).padStart(2, "0")}:
            {String(kickoff.getMinutes()).padStart(2, "0")}
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
            <div className="mt-2 text-center text-[10px]" style={{ color: "var(--dim)" }}>
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

      {/* Masthead de noticias */}
      <div className="bebas mt-6 px-4 text-2xl tracking-wider">
        EL DT DE TU VIDA INFORMA
      </div>
      <p className="px-4 text-xs" style={{ color: "var(--dim)" }}>
        Novedades del grupo
      </p>

      {/* Cuadro para publicar */}
      <div
        className="mx-3 mt-3 rounded-2xl px-4 py-3 text-sm"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "var(--dim)",
        }}
      >
        ✍️ Próximamente: escribirle al grupo
      </div>

      {/* Noticias */}
      {noticias && noticias.length > 0 ? (
        noticias.map((n) => (
          <article
            key={n.id}
            className="mx-3 mt-2 rounded-2xl px-4 py-3 text-sm"
            style={{
              background:
                n.kind === "auto"
                  ? "rgba(242,182,50,0.1)"
                  : "rgba(255,255,255,0.05)",
              borderLeft: n.kind === "auto" ? "3px solid var(--gold)" : "none",
            }}
          >
            <div className="font-semibold">{n.title}</div>
            {n.body && (
              <div className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
                {n.body}
              </div>
            )}
          </article>
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
    </div>
  );
}