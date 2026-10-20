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
  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .eq("user_id", userId)
    .in("status", statuses)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("No se pudieron cargar las membresías del usuario:", error);
    return [];
  }

  const memberships = (data ?? []) as unknown as GroupMembershipContext[];
  if (memberships.length === 0) return memberships;

  // Cargar los nombres por separado: si la relación anidada grupos/membresías
  // falla, no debemos ocultar una membresía válida ni bloquear el acceso.
  const groupIds = [...new Set(memberships.map((membership) => membership.group_id))];
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, name, slug")
    .in("id", groupIds);

  if (groupsError) {
    console.error("No se pudieron cargar los nombres de los grupos:", groupsError);
  }

  const groupsById = new Map((groups ?? []).map((group) => [group.id, group]));
  return memberships.map((membership) => ({
    ...membership,
    group: groupsById.get(membership.group_id) ?? null,
  }));
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
