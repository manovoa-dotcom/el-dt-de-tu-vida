import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ItemsClient from "./ItemsClient";

export type Item = {
  id: string;
  key: string;
  label: string;
  selection_type: "multiple" | "unica";
  points: number;
  active: boolean;
  sort_order: number;
};

export default async function ItemsPage() {
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
        <h1 className="bebas text-3xl">Ítems y puntos</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  // Verificar si hay un partido programado pendiente
  const ahora = new Date().toISOString();
  const { data: partidoActivo } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "programada")
    .gt("kickoff_at", ahora)
    .limit(1)
    .maybeSingle();

  const bloqueado = !!partidoActivo;
  const { data: items } = await supabase
    .from("items")
    .select("id, key, label, selection_type, points, active, sort_order")
    .eq("group_id", membership.group_id)
    .order("sort_order");

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
        <h1 className="bebas mt-2 text-3xl">Ítems y puntos</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Elegí qué suma puntos y cuánto vale cada uno
        </p>
      </header>

            <ItemsClient items={(items ?? []) as Item[]} bloqueado={bloqueado} />

      <div className="h-8" />
    </div>
  );
}