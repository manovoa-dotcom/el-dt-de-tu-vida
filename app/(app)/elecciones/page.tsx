import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EleccionesClient from "./EleccionesClient";

export default async function EleccionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("id, group_id, display_name")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Elecciones</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No estás activo en el grupo.
        </p>
      </div>
    );
  }

  // Elección abierta
  const { data: eleccion } = await supabase
    .from("elections")
    .select("id, round, motivo, closes_at, status")
    .eq("group_id", membership.group_id)
    .eq("status", "abierta")
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Candidatos: todos los activos (excepto vos mismo podés elegirte)
  const { data: candidatosRaw } = await supabase
    .from("group_members")
    .select("id, display_name, user_id, role")
    .eq("group_id", membership.group_id)
    .eq("status", "activo")
    .order("display_name");

  const userIds = (candidatosRaw ?? [])
    .map((c) => c.user_id)
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

  const candidatos = (candidatosRaw ?? []).map((c) => ({
    member_id: c.id,
    alias: c.display_name,
    photo_url: c.user_id ? perfiles[c.user_id]?.photo_url ?? null : null,
    es_admin_actual: c.role === "admin",
  }));

  // ¿Ya voté?
  let yaVote = false;
  if (eleccion) {
    const { data: miVoto } = await supabase
      .from("election_votes")
      .select("id")
      .eq("election_id", eleccion.id)
      .eq("voter_member_id", membership.id)
      .maybeSingle();
    yaVote = !!miVoto;
  }

  // Historial de elecciones cerradas
  const { data: historial } = await supabase
    .from("elections")
    .select(`
      id, round, status, closed_at, ganador_titular_id, ganador_suplente_id,
      titular:group_members!elections_ganador_titular_id_fkey (display_name),
      suplente:group_members!elections_ganador_suplente_id_fkey (display_name)
    `)
    .eq("group_id", membership.group_id)
    .eq("status", "cerrada")
    .order("closed_at", { ascending: false })
    .limit(5);

  const historialSimple = (historial ?? []).map((h) => {
    const t = h.titular as unknown as { display_name: string } | null;
    const s = h.suplente as unknown as { display_name: string } | null;
    return {
      id: h.id,
      round: h.round,
      closed_at: h.closed_at,
      titular: t?.display_name ?? "—",
      suplente: s?.display_name ?? "—",
    };
  });

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <h1 className="bebas text-3xl">Elecciones</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Elegí al admin titular y al suplente de la temporada
        </p>
      </header>

      <EleccionesClient
        eleccion={eleccion ?? null}
        candidatos={candidatos}
        yaVote={yaVote}
        historial={historialSimple}
      />

      <div className="h-8" />
    </div>
  );
}