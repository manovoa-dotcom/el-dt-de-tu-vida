import { cookies } from "next/headers";
import type { createClient } from "@/lib/supabase/server";

export const ACTIVE_GROUP_COOKIE = "dt_active_group_id";
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type MembershipStatus = "activo" | "pendiente";

export type GroupMembershipContext = {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
  role: string;
  status: MembershipStatus;
  joined_at: string;
  admin_tipo?: string | null;
  group?: { id: string; name: string; slug: string } | null;
};

export async function getUserGroupMemberships(
  supabase: SupabaseServerClient,
  userId: string,
  statuses: MembershipStatus[] = ["activo"]
): Promise<GroupMembershipContext[]> {
  const { data } = await supabase
    .from("group_members")
    .select("*, group:groups(id, name, slug)")
    .eq("user_id", userId)
    .in("status", statuses)
    .order("joined_at", { ascending: true });

  return (data ?? []) as unknown as GroupMembershipContext[];
}

export async function getCurrentGroupMembership(
  supabase: SupabaseServerClient,
  userId: string,
  statuses: MembershipStatus[] = ["activo"]
): Promise<GroupMembershipContext | null> {
  const memberships = await getUserGroupMemberships(supabase, userId, statuses);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const activeGroupId = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
  return memberships.find((membership) => membership.group_id === activeGroupId)
    ?? memberships.find((membership) => membership.status === "activo")
    ?? memberships[0];
}
