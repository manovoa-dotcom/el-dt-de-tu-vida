import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PlantelClient from "./PlantelClient";

export type Miembro = {
  id: string;
  user_id: string | null;
  display_name: string;
  real_name: string | null;
  email: string | null;
  role: string;
  status: string;
  joined_at: string;
  photo_url: string | null;
};

export default async function PlantelPage() {
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
        <h1 className="bebas text-3xl">Plantel</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  // Cargar todos los miembros del grupo
  const { data: miembrosRaw } = await supabase
    .from("group_members")
    .select(`
      id,
      user_id,
      display_name,
      role,
      status,
      joined_at
    `)
    .eq("group_id", membership.group_id)
    .order("display_name", { ascending: true });

  // Enriquecer con datos de profiles (nombre real y foto)
  const userIds = (miembrosRaw ?? [])
    .map((m) => m.user_id)
    .filter((x): x is string => !!x);

  let perfiles: Record<string, { real_name: string | null; photo_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, real_name, photo_url")
      .in("id", userIds);

    perfiles = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, { real_name: p.real_name, photo_url: p.photo_url }])
    );
  }

  const miembros: Miembro[] = (miembrosRaw ?? []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    display_name: m.display_name,
    real_name: m.user_id ? perfiles[m.user_id]?.real_name ?? null : null,
    email: null,
    role: m.role,
    status: m.status,
    joined_at: m.joined_at,
    photo_url: m.user_id ? perfiles[m.user_id]?.photo_url ?? null : null,
  }));

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
        <h1 className="bebas mt-2 text-3xl">Plantel y cuentas</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          {miembros.length} miembro{miembros.length !== 1 ? "s" : ""} en el grupo
        </p>
      </header>

      <PlantelClient miembros={miembros} />

      <div className="h-8" />
    </div>
  );
}