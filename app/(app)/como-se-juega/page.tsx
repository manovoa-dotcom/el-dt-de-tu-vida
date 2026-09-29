import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ComoSeJuegaClient from "./ComoSeJuegaClient";

export default async function ComoSeJuegaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("user_id", user.id)
    .in("status", ["activo"])
    .limit(1)
    .maybeSingle();

  const isAdmin = membership?.role === "admin";

  return <ComoSeJuegaClient isAdmin={isAdmin} />;
}