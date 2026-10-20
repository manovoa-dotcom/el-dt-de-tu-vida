import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RegistroAdminGrupoClient from "./RegistroAdminGrupoClient";

export default async function CrearGrupoAdminPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_group_invite", {
    p_token: token,
  });
  const invitacion = Array.isArray(data) ? data[0] : data;

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{
        background: "var(--g0)",
        backgroundImage: "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)",
        color: "var(--tx)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--gold)" }}>
            Invitación para administrar
          </p>
          <h1 className="bebas mt-1 text-4xl">El DT de tu vida</h1>
        </div>

        {error || !invitacion ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "var(--g1)" }}>
            <h2 className="bebas text-2xl">Este enlace ya no está disponible</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
              Puede haber vencido o ya se usó. Pedile a quien te lo compartió que genere uno nuevo.
            </p>
            <Link href="/login" className="mt-5 inline-block text-sm font-bold" style={{ color: "var(--gold)" }}>
              Ir al ingreso
            </Link>
          </div>
        ) : (
          <RegistroAdminGrupoClient token={token} nombreGrupo={invitacion.group_name} />
        )}
      </div>
    </main>
  );
}
