import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ConfigGrupoClient from "./ConfigGrupoClient";

export default async function ConfigGrupoPage() {
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
        <h1 className="bebas text-3xl">Configuración</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  const { data: grupo } = await supabase
    .from("groups")
      .select(
      "name, slug, presentismo_value, dt_pick_value, equipo_ideal_value, equipo_ideal_anio_size, invite_code"
    )
    .eq("id", membership.group_id)
    .single();

  if (!grupo) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Configuración</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          No se encontró el grupo.
        </p>
      </div>
    );
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
        <h1 className="bebas mt-2 text-3xl">Configuración del grupo</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Ajustes generales del campeonato
        </p>
      </header>

           <ConfigGrupoClient
        grupo={{
          name: grupo.name,
          slug: grupo.slug,
          presentismo_value: grupo.presentismo_value,
          dt_pick_value: grupo.dt_pick_value,
          equipo_ideal_value: grupo.equipo_ideal_value,
          equipo_ideal_anio_size: grupo.equipo_ideal_anio_size,
          invite_code: grupo.invite_code,
        }}
      />

      <div className="h-8" />
    </div>
  );
}