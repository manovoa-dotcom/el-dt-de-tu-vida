import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PartidoForm from "./PartidoForm";

export default async function PartidoPage() {
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
        <h1 className="bebas text-3xl">Config</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  // Partido programado actual (si existe)
  const { data: partido } = await supabase
    .from("matches")
    .select("id, number, kickoff_at, place, cupo, budget, status")
    .eq("group_id", membership.group_id)
    .eq("status", "programada")
    .gte("kickoff_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("kickoff_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Cargar estado de armado de equipos (solo si hay partido)
  let armado: {
    member_id: string;
    alias: string;
    photo_url: string | null;
    armo: boolean;
  }[] = [];

  if (partido) {
    // Miembros activos con cuenta (los que pueden ser DT)
    const { data: miembrosActivos } = await supabase
      .from("group_members")
      .select("id, display_name, user_id")
      .eq("group_id", membership.group_id)
      .eq("status", "activo")
      .not("user_id", "is", null)
      .order("display_name");

    const ids = (miembrosActivos ?? []).map((m) => m.id);

    // Quiénes ya armaron equipo
    let armadosSet = new Set<string>();
    if (ids.length > 0) {
      const { data: teams } = await supabase
        .from("fantasy_teams")
        .select("dt_member_id")
        .eq("match_id", partido.id)
        .in("dt_member_id", ids);

      armadosSet = new Set((teams ?? []).map((t) => t.dt_member_id));
    }

    // Perfiles
    const userIds = (miembrosActivos ?? [])
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

    armado = (miembrosActivos ?? []).map((m) => ({
      member_id: m.id,
      alias: m.display_name,
      photo_url: m.user_id ? perfiles[m.user_id]?.photo_url ?? null : null,
      armo: armadosSet.has(m.id),
    }));
  }

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
          {partido ? `Fecha ${partido.number}` : "Próximo partido"}
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          {partido
            ? "Editá los datos del próximo partido"
            : "Cargá los datos del próximo partido para habilitar la convocatoria"}
        </p>
      </header>

          <PartidoForm partido={partido ?? null} />

      {partido && armado.length > 0 && (
        <EquiposArmados armado={armado} />
      )}

      <div className="h-8" />
    </div>
  );
}
function EquiposArmados({
  armado,
}: {
  armado: {
    member_id: string;
    alias: string;
    photo_url: string | null;
    armo: boolean;
  }[];
}) {
  const total = armado.length;
  const listos = armado.filter((a) => a.armo).length;
  const faltan = total - listos;
  const porcentaje = total > 0 ? (listos / total) * 100 : 0;

  return (
    <div className="mx-3 mt-5">
      <div className="bebas px-1 text-lg tracking-wider">
        ARMADO DE EQUIPOS
      </div>
      <p className="px-1 text-[11px]" style={{ color: "var(--dim)" }}>
        Quién ya armó su equipo para esta fecha (no se ve el contenido)
      </p>

      <div
        className="mt-2 rounded-2xl p-4"
        style={{
          background: "var(--g1)",
          border: `1px solid ${faltan === 0 ? "rgba(242,182,50,0.5)" : "rgba(255,255,255,0.06)"}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--dim)" }}>
              DTs con equipo armado
            </div>
            <div className="bebas text-3xl">
              {listos} / {total}
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background:
                faltan === 0
                  ? "rgba(242,182,50,0.2)"
                  : "rgba(238,90,42,0.2)",
              color: faltan === 0 ? "var(--gold)" : "var(--or)",
            }}
          >
            {faltan === 0 ? "✓ Todos listos" : `Faltan ${faltan}`}
          </span>
        </div>

        <div
          className="mt-3 h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              background: faltan === 0 ? "var(--gold)" : "var(--or)",
              width: `${porcentaje}%`,
            }}
          />
        </div>

        <div className="mt-4 space-y-1">
          {armado.map((a) => (
            <div
              key={a.member_id}
              className="flex items-center gap-3 rounded-xl px-3 py-2"
              style={{
                background: a.armo
                  ? "rgba(242,182,50,0.08)"
                  : "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  background: a.armo ? "var(--gold)" : "rgba(255,255,255,0.1)",
                  color: a.armo ? "#12261c" : "var(--dim)",
                  border: a.armo ? "none" : "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {a.armo ? "✓" : "○"}
              </span>
              <span
                className="flex-1 truncate text-sm"
                style={{
                  color: a.armo ? "var(--tx)" : "var(--dim)",
                  fontWeight: a.armo ? 600 : 400,
                }}
              >
                {a.alias}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}