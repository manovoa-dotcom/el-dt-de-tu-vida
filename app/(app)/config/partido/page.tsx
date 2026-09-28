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

      <div className="h-8" />
    </div>
  );
}