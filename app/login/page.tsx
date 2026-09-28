"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const claveRef = useRef<HTMLInputElement>(null);

  async function handleLogin() {
    setError(null);

    // 1. Forzar el blur del input activo.
    //    En Android, los teclados predictivos mantienen el texto
    //    "en el aire" hasta que el input pierde foco. Al tocar el
    //    botón, a veces el input no perdió foco todavía y el valor
    //    del DOM está incompleto o vacío.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 2. Esperar un tick para que el DOM se actualice con el valor
    //    ya "commiteado" del teclado.
    await new Promise((r) => setTimeout(r, 80));

    const email = emailRef.current?.value.trim() ?? "";
    const clave = claveRef.current?.value ?? "";

    // 3. Validar
    if (!email) {
      setError("Poné tu email");
      return;
    }
    if (clave.length < 6) {
      setError(`La clave tiene que tener 6 caracteres o más (tiene ${clave.length})`);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password: clave,
    });

    if (err) {
      setError("Email o clave incorrectos");
      setLoading(false);
      return;
    }

    router.push("/inicio");
    router.refresh();
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 py-10"
      style={{
        background: "var(--g0)",
        backgroundImage:
          "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)",
        color: "var(--tx)",
      }}
    >
      <div className="w-full max-w-md">
                <div className="mb-8 text-center">
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(160deg, #1b4f39, #11352a)",
              border: "2px solid var(--gold)",
              boxShadow: "0 8px 24px rgba(242,182,50,0.2)",
            }}
          >
            <span className="text-5xl">⚽</span>
          </div>
          <h1 className="bebas mt-4 text-4xl" style={{ color: "var(--tx)" }}>
            El DT de tu vida
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
            Armá tu equipo cada fecha, aunque no te haya tocado jugar.
          </p>
        </div>

        <div
          className="rounded-2xl p-7"
          style={{
            background: "var(--g1)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="bebas text-2xl">Ingresar</h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            noValidate
            className="mt-6 space-y-4"
          >
            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--dim)" }}
              >
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                name="email"
                inputMode="email"
                placeholder="tu@email.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--dim)" }}
              >
                Clave (6+ caracteres)
              </label>
              <input
                ref={claveRef}
                type="password"
                autoComplete="current-password"
                name="password"
                placeholder="••••••"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-3 py-2 text-sm"
                style={{
                  background: "rgba(226,59,77,0.15)",
                  color: "#ffc1c9",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-50"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div
            className="mt-6 border-t pt-4 text-center text-sm"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              color: "var(--dim)",
            }}
          >
            ¿Tenés link del grupo?{" "}
            <Link
              href="/unirse/futbol-champagne"
              className="font-semibold"
              style={{ color: "var(--gold)" }}
            >
              Registrate
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--dim)" }}>
          Un grupo. Un partido. Un campeonato. Todos juegan.
        </p>
      </div>
    </main>
  );
}