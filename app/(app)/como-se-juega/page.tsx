import { getCurrentGroupMembership } from "@/lib/group-context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ComoSeJuegaClient from "./ComoSeJuegaClient";

export default async function ComoSeJuegaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  const isAdmin = membership?.role === "admin";

  return <ComoSeJuegaClient isAdmin={isAdmin} />;
}