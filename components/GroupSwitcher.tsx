"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activarGrupoAction } from "@/app/actions";

type GroupOption = { id: string; name: string };

export default function GroupSwitcher({
  groups,
  activeGroupId,
}: {
  groups: GroupOption[];
  activeGroupId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  if (groups.length < 2) return null;

  function cambiar(groupId: string) {
    setError(false);
    startTransition(async () => {
      const ok = await activarGrupoAction(groupId);
      if (!ok) {
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="px-3 pr-16 pt-3">
      <label className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="shrink-0 text-xs" style={{ color: "var(--dim)" }}>Grupo:</span>
        <select
          value={activeGroupId}
          disabled={isPending}
          onChange={(event) => cambiar(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
          style={{ color: "var(--gold)" }}
          aria-label="Elegir grupo"
        >
          {groups.map((group) => <option key={group.id} value={group.id} style={{ color: "#111" }}>{group.name}</option>)}
        </select>
        {isPending && <span className="text-xs" style={{ color: "var(--dim)" }}>Cambiando…</span>}
      </label>
      {error && <p className="mt-1 px-2 text-xs" style={{ color: "#ffc1c9" }}>No se pudo cambiar de grupo. Recargá la página y probá de nuevo.</p>}
    </div>
  );
}
