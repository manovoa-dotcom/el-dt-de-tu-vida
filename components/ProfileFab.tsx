"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";

type Props = {
  alias: string;
  photoUrl: string | null;
};

export default function ProfileFab({ alias, photoUrl }: Props) {
  const pathname = usePathname();
  if (pathname.startsWith("/perfil")) return null;

  return (
    <Link
      href="/perfil"
      className="fixed z-40 flex flex-col items-center no-underline"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        right: 12,
      }}
    >
      <div
        style={{
          borderRadius: "50%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        <Avatar
          alias={alias}
          photoUrl={photoUrl}
          size={40}
          ringColor="var(--gold)"
        />
      </div>
      <div
        className="mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
        style={{
          background: "rgba(8,25,15,0.85)",
          color: "var(--gold)",
          border: "1px solid rgba(242,182,50,0.3)",
        }}
      >
        Perfil
      </div>
    </Link>
  );
}