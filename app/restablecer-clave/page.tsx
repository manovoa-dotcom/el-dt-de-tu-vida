"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RestablecerClavePage() {
  const [clave, setClave] = useState("");
  const [repetirClave, setRepetirClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actualizada, setActualizada] = useState(false);

  async function guardarClave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (clave.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (clave !== repetirClave) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: clave });
    if (updateError) {
      console.error("Error actualizando clave:", updateError);
      setError("El enlace venció o ya fue usado. Pedí otro desde “Olvidaste tu contraseña”.");
      setLoading(false);
      return;
    }

    // Termina la sesión temporal de recuperación para que el usuario vuelva
    // a ingresar con la clave nueva y cargue su membresía habitual.
    await supabase.auth.signOut({ scope: "local" });
    setActualizada(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" style={{ background: "var(--g0)", backgroundImage: "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)", color: "var(--tx)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="bebas text-4xl">Elegí una clave nueva</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>Usá al menos 6 caracteres.</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {actualizada ? (
            <div className="text-center">
              <p className="text-sm leading-relaxed" style={{ color: "var(--gold)" }}>Tu contraseña se cambió correctamente. Ahora ingresá con tu correo y la contraseña nueva.</p>
              <Link href="/login" className="mt-5 inline-block w-full rounded-xl py-3 text-sm font-bold" style={{ background: "var(--or)", color: "#fff" }}>Ir a ingresar</Link>
            </div>
          ) : (
            <form onSubmit={guardarClave} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--dim)" }}>Contraseña nueva</span>
                <input type="password" autoComplete="new-password" minLength={6} required value={clave} onChange={(event) => setClave(event.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--tx)" }} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--dim)" }}>Repetí la contraseña</span>
                <input type="password" autoComplete="new-password" minLength={6} required value={repetirClave} onChange={(event) => setRepetirClave(event.target.value)} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--tx)" }} />
              </label>
              {error && <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(226,59,77,0.15)", color: "#ffc1c9" }}>{error}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50" style={{ background: "var(--or)", color: "#fff" }}>{loading ? "Guardando..." : "Guardar contraseña"}</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
