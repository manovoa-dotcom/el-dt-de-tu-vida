"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({
  label = "Cerrar sesión",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();

  async function handle() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handle}
      className={
        compact
          ? "flex-none rounded-lg px-3 py-1.5 text-xs font-medium transition"
          : "mt-6 rounded-xl border px-4 py-2 text-sm font-medium transition"
      }
      style={{
        border: "1px solid rgba(255,255,255,0.15)",
        color: "var(--dim)",
        background: compact ? "rgba(255,255,255,0.03)" : "transparent",
      }}
    >
      {label}
    </button>
  );
}