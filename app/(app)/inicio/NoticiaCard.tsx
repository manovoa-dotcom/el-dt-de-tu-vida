"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { toggleReaccion } from "./actions";

const EMOJIS = ["🔥", "😂", "👏"];

type Reaccion = {
  emoji: string;
  cantidad: number;
  yo_reaccione: boolean;
};

type Props = {
  newsId: string;
  kind: "auto" | "usuario";
  titulo: string;
  cuerpo: string | null;
  authorAlias: string | null;
  authorPhoto: string | null;
  createdAt: string;
  reacciones: Reaccion[];
};

export default function NoticiaCard({
  newsId,
  kind,
  titulo,
  cuerpo,
  authorAlias,
  authorPhoto,
  createdAt,
  reacciones,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function reaccionar(emoji: string) {
    startTransition(async () => {
      await toggleReaccion(newsId, emoji);
      router.refresh();
    });
  }

  function compartir() {
    const texto = authorAlias
      ? `${authorAlias} en El DT de tu vida:\n\n${titulo}`
      : `${titulo}\n\nEl DT de tu vida`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }

  const esAuto = kind === "auto";

  return (
    <article
      className="mx-3 mt-2 rounded-2xl px-4 py-3"
      style={{
        background: esAuto ? "rgba(242,182,50,0.1)" : "rgba(255,255,255,0.05)",
        borderLeft: esAuto ? "3px solid var(--gold)" : "none",
        border: !esAuto ? "1px solid rgba(255,255,255,0.06)" : undefined,
      }}
    >
      {/* Autor o encabezado automático */}
      {esAuto ? (
        <div className="flex items-center gap-2">
          <span className="text-sm">📣</span>
          <div
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--gold)" }}
          >
            Novedades · {tiempoRelativo(createdAt)}
          </div>
        </div>
      ) : authorAlias ? (
        <div className="flex items-center gap-2">
          <Avatar alias={authorAlias} photoUrl={authorPhoto} size={28} />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{authorAlias}</div>
            <div className="text-[10px]" style={{ color: "var(--dim)" }}>
              {tiempoRelativo(createdAt)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Contenido */}
      <div
        className={`${!esAuto && authorAlias ? "mt-2" : esAuto ? "mt-1" : ""} whitespace-pre-wrap text-sm`}
        style={{ color: "var(--tx)" }}
      >
        {titulo}
      </div>
      {cuerpo && (
        <div className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          {cuerpo}
        </div>
      )}

      {/* Reacciones + compartir */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {EMOJIS.map((emoji) => {
            const r = reacciones.find((x) => x.emoji === emoji);
            const cantidad = r?.cantidad ?? 0;
            const yo = r?.yo_reaccione ?? false;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => reaccionar(emoji)}
                disabled={isPending}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition disabled:opacity-50"
                style={{
                  background: yo
                    ? "rgba(242,182,50,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: yo
                    ? "1px solid rgba(242,182,50,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: yo ? "var(--gold)" : "var(--dim)",
                }}
              >
                <span>{emoji}</span>
                {cantidad > 0 && <span className="font-bold">{cantidad}</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={compartir}
          className="rounded-full px-2 py-0.5 text-xs transition"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--dim)",
          }}
        >
          ↗ Compartir
        </button>
      </div>
    </article>
  );
}

function tiempoRelativo(iso: string): string {
  const ahora = Date.now();
  const t = new Date(iso).getTime();
  const seg = Math.floor((ahora - t) / 1000);
  if (seg < 60) return "ahora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs} h`;
  const dias = Math.floor(hs / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-AR");
}