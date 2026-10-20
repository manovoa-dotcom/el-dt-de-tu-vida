import { getCurrentGroupMembership } from "@/lib/group-context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PerfilClient from "./PerfilClient";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const params = await searchParams;
  const bienvenida = params.bienvenida === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, real_name, photo_url")
    .eq("id", user.id)
    .maybeSingle();

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo", "pendiente"]);

  const grupo = membership?.group as unknown as { name: string } | null;

  return (
    <PerfilClient
      userId={user.id}
      email={user.email ?? ""}
      alias={profile?.display_name ?? "DT"}
      realName={profile?.real_name ?? ""}
      photoUrl={profile?.photo_url ?? null}
      grupoNombre={grupo?.name ?? null}
      bienvenida={bienvenida}
    />
  );
}