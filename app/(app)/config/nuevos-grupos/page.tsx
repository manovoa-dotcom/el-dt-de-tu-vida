import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import NuevosGruposClient from "./NuevosGruposClient";

export default async function NuevosGruposPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isPlatformAdmin(user.email)) {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Crear un nuevo grupo</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Esta opción está disponible únicamente para la persona autorizada.
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <Link href="/config" className="text-xs no-underline" style={{ color: "var(--dim)" }}>
          ← Configuración
        </Link>
        <h1 className="bebas mt-2 text-3xl">Crear un nuevo grupo</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Generá un enlace personal para quien va a administrar el grupo.
        </p>
      </header>
      <NuevosGruposClient />
      <div className="h-8" />
    </div>
  );
}
