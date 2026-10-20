import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TabBar from "@/components/TabBar";
import ProfileFab from "@/components/ProfileFab";
import LogoutButton from "@/components/LogoutButton";
import AppBadge from "@/components/AppBadge";
import OnboardingLayer from "@/components/OnboardingLayer";
import GroupSwitcher from "@/components/GroupSwitcher";
import { getCurrentGroupMembership, getUserGroupMemberships } from "@/lib/group-context";

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

  const memberships = await getUserGroupMemberships(supabase, user.id, ["activo", "pendiente"]);
  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo", "pendiente"]);

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
          <p className="mt-3 text-xs" style={{ color: "var(--dim)" }}>
            Cuenta conectada: {user.email ?? "correo no disponible"}
          </p>
          <LogoutButton label="Salir y volver a ingresar" />
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

// ¿Hay algún partido ya jugado? (para el paso de Resultados)
  const { data: algunPartidoJugado } = await supabase
    .from("matches")
    .select("id")
    .eq("group_id", membership.group_id)
    .in("status", ["jugada", "cerrada"])
    .limit(1)
    .maybeSingle();

  const hayPartidoJugado = !!algunPartidoJugado;

    // Contar noticias no leídas y miembros pendientes (solo admin)
  const miembro = membership?.status === "activo" ? membership : null;

// Contar miembros pendientes de aprobar (solo admins)
  let pendientesCount = 0;
  if (isAdmin && membership.group_id) {
    const { count: cPend } = await supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", membership.group_id)
      .eq("status", "pendiente");
    pendientesCount = cPend ?? 0;
  }


  let noLeidas = 0;
  if (miembro) {
    const { data: todas } = await supabase
      .from("news")
      .select("id")
      .eq("group_id", miembro.group_id);

    if (todas && todas.length > 0) {
      const { data: leidas } = await supabase
        .from("news_reads")
        .select("news_id")
        .eq("member_id", miembro.id)
        .in("news_id", todas.map((n) => n.id));

      const leidasSet = new Set((leidas ?? []).map((r) => r.news_id));
      noLeidas = todas.filter((n) => !leidasSet.has(n.id)).length;
    }
  }

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
      <GroupSwitcher
        groups={memberships.filter((m) => m.status === "activo").map((m) => ({ id: m.group_id, name: m.group?.name ?? "Grupo" }))}
        activeGroupId={membership.group_id}
      />
      <ProfileFab
        alias={membership.display_name}
        photoUrl={perfil?.photo_url ?? null}
      />
      <AppBadge count={noLeidas} />
      {children}
       <TabBar
        isAdmin={isAdmin}
        badgeInicio={noLeidas}
        badgeConfig={pendientesCount}
      />
      <OnboardingLayer hayPartidoJugado={hayPartidoJugado} />
    </div>
  );
}
