import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Membresía activa
  const { data: membership } = await supabase
    .from("group_members")
    .select(`
      id,
      display_name,
      role,
      status,
      group:groups (id, name, slug, convocatoria_dow, convocatoria_time)
    `)
    .eq("user_id", user.id)
    .in("status", ["activo", "pendiente"])
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.group) {
    return null; // el layout ya muestra el mensaje
  }

  const grupo = membership.group as unknown as {
    id: string;
    name: string;
    slug: string;
    convocatoria_dow: number;
    convocatoria_time: string;
  };

  // Foto del usuario actual
  const { data: miPerfil } = await supabase
    .from("profiles")
    .select("photo_url")
    .eq("id", user.id)
    .maybeSingle();
  const miPhotoUrl = miPerfil?.photo_url ?? null;

  // Próximo partido programado
  const { data: proximo } = await supabase
    .from("matches")
    .select("id, number, kickoff_at, place, cupo, status")
    .eq("group_id", grupo.id)
    .eq("status", "programada")
    .gte("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Cantidad de anotados en el próximo partido
  let anotados = 0;
  let espera = 0;
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

    anotados = countAnotados ?? 0;
    espera = countEspera ?? 0;
  }

  // Últimas noticias
  const { data: noticias } = await supabase
    .from("news")
    .select("id, kind, title, body, created_at, author_id")
    .eq("group_id", grupo.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // ¿Estás anotado al próximo partido?
  let estoyAnotado = false;
  if (proximo) {
    const { data: miAsistencia } = await supabase
      .from("attendance")
      .select("status")
      .eq("match_id", proximo.id)
      .eq("member_id", membership.id)
      .maybeSingle();

    estoyAnotado = miAsistencia?.status === "anotado" || miAsistencia?.status === "presente";
  }

  const isAdmin = membership.role === "admin";
  const kickoff = proximo ? new Date(proximo.kickoff_at) : null;

  return (
    <div>
      {/* Header */}
      <header className="px-4 pb-2 pt-6">
                <Link
          href="/perfil"
          className="flex items-start justify-between gap-3 no-underline"
          style={{ color: "var(--tx)" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              alias={membership.display_name}
              photoUrl={miPhotoUrl}
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
          </div>
        </Link>
      </header>

      {/* Próximo partido */}
      {proximo && kickoff ? (
        <Link
          href="/convocatoria"
          className="mx-3 mt-3 block rounded-2xl p-4 no-underline"
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
            {String(kickoff.getHours()).padStart(2, "0")}:{String(kickoff.getMinutes()).padStart(2, "0")}
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
              className="h-full rounded-full"
              style={{
                background: "var(--gold)",
                width: `${Math.min(100, (anotados / proximo.cupo) * 100)}%`,
              }}
            />
          </div>
          <div className="text-xs" style={{ color: "var(--dim)" }}>
            {anotados} de {proximo.cupo}
            {anotados >= proximo.cupo ? " · completo" : ""}
            {espera > 0 ? ` · lista de espera: ${espera}` : ""}
          </div>

          <div
            className="mt-3 rounded-xl border py-2 text-center text-sm font-bold"
            style={{
              borderColor: "var(--gold)",
              color: "var(--gold)",
            }}
          >
            {estoyAnotado ? "✓ Estás anotado" : "Anotarme"}
          </div>
        </Link>
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

      {/* Lista de noticias */}
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
        <div className="mx-3 mt-3 rounded-2xl p-5 text-center text-sm"
             style={{ background: "var(--g1)", color: "var(--dim)" }}>
          Todavía no hay novedades.
          <br />
          Cuando se abra la convocatoria, vas a ver acá todas las noticias del grupo.
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}