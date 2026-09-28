import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TabBar from "@/components/TabBar";
import ProfileFab from "@/components/ProfileFab";
import LogoutButton from "@/components/LogoutButton";


export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role, status, display_name")
    .eq("user_id", user.id)
    .in("status", ["activo", "pendiente"])
    .limit(1)
    .maybeSingle();

  // Sin grupo
  if (!membership) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-5 text-center"
        style={{
          background: "var(--g0)",
          backgroundImage:
            "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)",
          color: "var(--tx)",
        }}
      >
        <div className="max-w-sm">
          <div className="text-5xl">📭</div>
          <h1 className="bebas mt-4 text-3xl">Todavía no estás en un grupo</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
            Pedile a alguien del grupo que te pase el link de invitación.
          </p>
        </div>
      </main>
    );
  }

  // Pendiente
  if (membership.status === "pendiente") {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-5 text-center"
        style={{
          background: "var(--g0)",
          backgroundImage:
            "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)",
          color: "var(--tx)",
        }}
      >
        <div className="max-w-sm">
          <div className="text-5xl">⏳</div>
          <h1 className="bebas mt-4 text-3xl">Esperando aprobación</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
            Tu cuenta fue creada. Un admin del grupo tiene que aprobarte
            antes de que puedas entrar a jugar.
          </p>
          <LogoutButton />
        </div>
      </main>
    );
  }

  const isAdmin = membership.role === "admin";

  // Foto del usuario para el FAB
  const { data: perfil } = await supabase
    .from("profiles")
    .select("photo_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--g0)",
        color: "var(--tx)",
        paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        backgroundImage:
          "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)",
      }}
    >
      <ProfileFab
        alias={membership.display_name}
        photoUrl={perfil?.photo_url ?? null}
        />

      {children}
      <TabBar isAdmin={isAdmin} />
    </div>
  );
}