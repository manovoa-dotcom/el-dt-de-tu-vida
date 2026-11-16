import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginClient from "./LoginClient";

type Props = {
  searchParams: Promise<{ grupo?: string | string[] }>;
};

function getGroupSlug(params: Awaited<Props["searchParams"]>) {
  return typeof params.grupo === "string"
    ? params.grupo
    : params.grupo?.[0] ?? null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const groupSlug = getGroupSlug(await searchParams);
  return {
    manifest: groupSlug
      ? `/manifest-invitacion?grupo=${encodeURIComponent(groupSlug)}`
      : "/manifest.json",
  };
}

export default async function LoginPage({ searchParams }: Props) {
  const groupSlug = getGroupSlug(await searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(
      groupSlug
        ? `/unirse/${encodeURIComponent(groupSlug)}`
        : "/inicio"
    );
  }

  return <LoginClient groupSlug={groupSlug} />;
}
