import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SuspenderClient from "./SuspenderClient";

export default async function SuspenderPage() {
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
        <h1 className="bebas text-3xl">Suspender fecha</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "activa")
    .maybeSingle();

  let partidosProgramados: {
    id: string;
    number: number;
    kickoff_at: string;
    place: string | null;
  }[] = [];

  let partidosSuspendidos: typeof partidosProgramados = [];

  if (season) {
    const { data: programados } = await supabase
      .from("matches")
      .select("id, number, kickoff_at, place")
      .eq("season_id", season.id)
      .eq("status", "programada")
      .order("number", { ascending: true });

    partidosProgramados = programados ?? [];

    const { data: suspendidos } = await supabase
      .from("matches")
      .select("id, number, kickoff_at, place")
      .eq("season_id", season.id)
      .eq("status", "suspendida")
      .order("number", { ascending: false });

    partidosSuspendidos = suspendidos ?? [];
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
        <h1 className="bebas mt-2 text-3xl">Suspender fecha</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Por lluvia, falta de cancha, feriado u otro motivo
        </p>
      </header>

      <SuspenderClient
        partidosProgramados={partidosProgramados}
        partidosSuspendidos={partidosSuspendidos}
      />

      <div className="h-8" />
    </div>
  );
}