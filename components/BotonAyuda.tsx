"use client";

export default function BotonAyuda() {
  function reabrir() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("onboarding:start"));
    }
  }

  return (
    <button
      type="button"
      onClick={reabrir}
      className="inline-flex items-center gap-1 text-xs transition"
      style={{
        color: "var(--dim)",
        background: "transparent",
        border: "none",
        padding: 0,
      }}
      aria-label="Ver tutorial de nuevo"
    >
      ❓ Ayuda
    </button>
  );
}