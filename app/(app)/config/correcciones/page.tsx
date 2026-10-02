import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function CorreccionesPage() {
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

  if (!membership) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Historial</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No estás activo en el grupo.
        </p>
      </div>
    );
  }

  // Traer las últimas 100 correcciones del grupo
  const { data: correccionesRaw } = await supabase
    .from("corrections")
    .select("id, entity, description, before_data, after_data, by_user_id, created_at")
    .eq("group_id", membership.group_id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Traer alias de los usuarios que hicieron las correcciones
  const byUserIds = (correccionesRaw ?? [])
    .map((c) => c.by_user_id)
    .filter((x): x is string => !!x);

  let perfiles: Record<string, string> = {};
  if (byUserIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", byUserIds);
    perfiles = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, p.display_name])
    );
  }

  const correcciones = (correccionesRaw ?? []).map((c) => {
    const fecha = new Date(c.created_at);
    return {
      id: c.id,
      entity: c.entity as string,
      description: c.description,
      byAlias: c.by_user_id ? perfiles[c.by_user_id] ?? "—" : "—",
      createdAt: c.created_at,
      fechaTexto: `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]} · ${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`,
    };
  });

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
        <h1 className="bebas mt-2 text-3xl">Historial de correcciones</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Todas las correcciones que hizo el admin, visibles para el grupo
        </p>
      </header>

      {correcciones.length === 0 ? (
        <div
          className="mx-3 mt-3 rounded-2xl p-6 text-center"
          style={{
            background: "var(--g1)",
            border: "1px dashed rgba(255,255,255,0.15)",
          }}
        >
          <div className="text-4xl">📋</div>
          <p className="bebas mt-3 text-xl">Sin correcciones todavía</p>
          <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
            Cuando el admin modifique algún resultado o anule una tarjeta,
            va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          {correcciones.map((c) => (
            <FilaCorreccion key={c.id} correccion={c} />
          ))}
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}

function FilaCorreccion({
  correccion,
}: {
  correccion: {
    id: string;
    entity: string;
    description: string;
    byAlias: string;
    fechaTexto: string;
  };
}) {
  const iconos: Record<string, string> = {
    resultado: "📊",
    tarjeta: "🟥",
    valor_mercado: "💰",
    asistencia: "✍️",
    equipo: "🎯",
    clave: "🔑",
    otro: "✏️",
  };

  const icono = iconos[correccion.entity] ?? "✏️";

  return (
    <div
      className="mx-3 mt-2 rounded-2xl px-4 py-3"
      style={{
        background: "var(--g1)",
        borderLeft: "3px solid var(--gold)",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{icono}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm" style={{ color: "var(--tx)" }}>
            {correccion.description}
          </div>
          <div className="mt-1 text-[10px]" style={{ color: "var(--dim)" }}>
            {correccion.byAlias} · {correccion.fechaTexto}
          </div>
        </div>
      </div>
    </div>
  );
}