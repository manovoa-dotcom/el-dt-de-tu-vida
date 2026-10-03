import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CierreClient from "./CierreClient";

export default async function CierrePage() {
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
        <h1 className="bebas text-3xl">Cierre de temporada</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  const { data: temporadaActiva } = await supabase
    .from("seasons")
    .select("id, name, resumen_cierre, closed_at")
    .eq("group_id", membership.group_id)
    .eq("status", "activa")
    .maybeSingle();

  const { data: historial } = await supabase
    .from("seasons")
    .select("id, name, resumen_cierre, closed_at")
    .eq("group_id", membership.group_id)
    .eq("status", "cerrada")
    .order("closed_at", { ascending: false });

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
        <h1 className="bebas mt-2 text-3xl">Cierre de temporada</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Resumen del año, respaldo y salón de la fama
        </p>
      </header>

      <CierreClient
        temporadaActiva={temporadaActiva ?? null}
        historial={historial ?? []}
      />

      <div className="h-8" />
    </div>
  );
}