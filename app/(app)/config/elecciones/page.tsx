import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import EleccionesAdminClient from "./EleccionesAdminClient";

export default async function EleccionesAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role, admin_tipo")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Elecciones</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  const { data: eleccion } = await supabase
    .from("elections")
    .select("id, round, motivo, closes_at, status, opens_at")
    .eq("group_id", membership.group_id)
    .eq("status", "abierta")
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();

  let votosCount = 0;
  let totalActivos = 0;
  if (eleccion) {
    const { count: cVotos } = await supabase
      .from("election_votes")
      .select("id", { count: "exact", head: true })
      .eq("election_id", eleccion.id);
    votosCount = cVotos ?? 0;

    const { count: cActivos } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", membership.group_id)
      .eq("status", "activo");
    totalActivos = cActivos ?? 0;
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
        <h1 className="bebas mt-2 text-3xl">Elecciones</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Convocá, seguí y cerrá las elecciones de administradores
        </p>
      </header>

      <EleccionesAdminClient
        eleccion={eleccion ?? null}
        votosCount={votosCount}
        totalActivos={totalActivos}
      />

      <div className="h-8" />
    </div>
  );
}