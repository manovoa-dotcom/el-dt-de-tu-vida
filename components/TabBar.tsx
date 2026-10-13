"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/inicio", icon: "🏠", label: "Inicio" },
  { href: "/convocatoria", icon: "👥", label: "Convocatoria" },
  { href: "/resultados", icon: "📊", label: "Resultados" },
  { href: "/ranking", icon: "🏆", label: "Ranking" },
  { href: "/config", icon: "⚙️", label: "Config", adminOnly: true },
];

type Props = {
  isAdmin: boolean;
  badgeInicio?: number;
  badgeConfig?: number;
};

export default function TabBar({
  isAdmin,
  badgeInicio = 0,
  badgeConfig = 0,
}: Props) {

  const pathname = usePathname();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const tabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t"
id="onboarding-tabbar"
        style={{
          background: "#06120b",
          borderColor: "rgba(255,255,255,0.06)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
               {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          const badge =
            t.href === "/inicio"
              ? badgeInicio
              : t.href === "/config"
              ? badgeConfig
              : 0;
          const mostrarBadge = badge > 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              id={
                t.href === "/resultados"
                  ? "onboarding-tab-resultados"
                  : undefined
              }
              className="relative flex-1 py-2 text-center no-underline transition"
              style={{ color: active ? "var(--gold)" : "var(--dim)" }}
            >
              <div className="relative inline-block">
                <div className="text-lg leading-none">{t.icon}</div>
                {mostrarBadge && (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                    style={{
                      background: "var(--red)",
                      color: "#fff",
                      boxShadow: "0 0 0 2px #06120b",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[10px] font-medium">{t.label}</div>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="flex-1 py-2 text-center transition"
          style={{ color: "var(--dim)" }}
        >
          <div className="flex justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
          <div className="mt-1 text-[10px] font-medium">Salir</div>
        </button>
      </nav>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => !loading && setConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{
              background: "var(--g1)",
              border: "1px solid rgba(226,59,77,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl">🚪</div>
            <h2 className="bebas mt-3 text-2xl">¿Cerrar sesión?</h2>
            <p className="mt-2 text-xs" style={{ color: "var(--dim)" }}>
              Vas a tener que volver a ingresar con tu email y clave.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-xl border py-3 text-sm font-bold transition disabled:opacity-50"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "var(--dim)",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="flex-1 rounded-xl py-3 text-sm font-bold transition disabled:opacity-50"
                style={{ background: "var(--red)", color: "#fff" }}
              >
                {loading ? "Saliendo..." : "Salir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}