import { getCurrentGroupMembership } from "@/lib/group-context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PartidoForm from "./PartidoForm";
import BotonAvisar from "./BotonAvisar";
import EquiposArmadosSeleccion from "./EquiposArmadosSeleccion";

export default async function PartidoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

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

   // Quién ya armó equipo (vía RPC para saltar RLS)
    const { data: teams } = await supabase.rpc("get_dts_que_armaron", {
      p_match_id: partido.id,
    });

    const armadosSet = new Set<string>(
      (teams ?? []).map((t: { dt_member_id: string }) => t.dt_member_id)
    );

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

      {partido && <BotonAvisar matchId={partido.id} />}

      {partido && armado.length > 0 && (
        <EquiposArmadosSeleccion armado={armado} matchId={partido.id} />
      )}

      <div className="h-8" />
    </div>
  );
}
