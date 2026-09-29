"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publicarNoticia } from "./actions";

export default function NoticiaForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  function publicar() {
    setError(null);
    const t = texto.trim();
    if (t.length < 2) {
      setError("Escribí algo primero");
      setTimeout(() => setError(null), 2000);
      return;
    }

    startTransition(async () => {
      const res = await publicarNoticia(t);
      if (res.ok) {
        setTexto("");
        router.refresh();
      } else {
        setError(res.error ?? "Error");
        setTimeout(() => setError(null), 2500);
      }
    });
  }

  return (
    <div className="mx-3 mt-3">
      <div
        className="rounded-2xl px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="✍️ Escribile al grupo…"
          maxLength={500}
          rows={2}
          className="w-full resize-none bg-transparent text-sm outline-none"
          style={{ color: "var(--tx)" }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px]" style={{ color: "var(--dim)" }}>
            {texto.length}/500
          </span>
          <button
            type="button"
            onClick={publicar}
            disabled={isPending || texto.trim().length < 2}
            className="rounded-xl px-4 py-1.5 text-xs font-bold transition disabled:opacity-50"
            style={{ background: "var(--or)", color: "#fff" }}
          >
            {isPending ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-1 px-1 text-xs" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}