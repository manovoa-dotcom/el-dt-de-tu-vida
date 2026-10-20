"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarClavePage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function enviarSolicitud(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const email = emailRef.current?.value.trim() ?? "";
    if (!email) {
      setError("Escribí el correo de tu cuenta.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/restablecer-clave`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      console.error("Error solicitando recuperación de clave:", resetError);
      setError("No se pudo enviar el correo. Esperá un momento y probá de nuevo.");
      setLoading(false);
      return;
    }

    setEnviado(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10" style={{ background: "var(--g0)", backgroundImage: "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)", color: "var(--tx)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="bebas text-4xl">Recuperar contraseña</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>Te vamos a enviar un enlace a tu correo para elegir una clave nueva.</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {enviado ? (
            <div className="text-center">
              <p className="text-sm leading-relaxed" style={{ color: "var(--gold)" }}>
                Si existe una cuenta con ese correo, te enviaremos un enlace para cambiar la contraseña. Revisá también la carpeta de correo no deseado.
              </p>
              <Link href="/login" className="mt-5 inline-block text-sm font-semibold" style={{ color: "var(--gold)" }}>Volver a ingresar</Link>
            </div>
          ) : (
            <form onSubmit={enviarSolicitud} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--dim)" }}>Correo de tu cuenta</span>
                <input ref={emailRef} type="email" autoComplete="email" required placeholder="tu@email.com" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--tx)" }} />
              </label>

              {error && <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(226,59,77,0.15)", color: "#ffc1c9" }}>{error}</p>}

              <button type="submit" disabled={loading} className="w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50" style={{ background: "var(--or)", color: "#fff" }}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>
              <div className="text-center">
                <Link href="/login" className="text-sm font-semibold" style={{ color: "var(--gold)" }}>Volver a ingresar</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
