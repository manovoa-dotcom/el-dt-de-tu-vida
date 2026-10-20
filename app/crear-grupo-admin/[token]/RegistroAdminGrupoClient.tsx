"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegistroAdminGrupoClient({
  token,
  nombreGrupo,
}: {
  token: string;
  nombreGrupo: string;
}) {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const claveRef = useRef<HTMLInputElement>(null);
  const clave2Ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function registrar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setExito(null);

    const email = emailRef.current?.value.trim() ?? "";
    const realName = nombreRef.current?.value.trim() ?? "";
    const alias = aliasRef.current?.value.trim() ?? "";
    const password = claveRef.current?.value ?? "";
    const passwordConfirm = clave2Ref.current?.value ?? "";

    if (realName.length < 2) return setError("Escribí tu nombre real");
    if (alias.length < 2) return setError("El alias debe tener al menos 2 caracteres");
    if (password.length < 6) return setError("La clave debe tener al menos 6 caracteres");
    if (password !== passwordConfirm) return setError("Las claves no coinciden");

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: alias,
          real_name: realName,
          admin_group_token: token,
        },
      },
    });

    if (signUpError) {
      console.error(signUpError);
      setError("No se pudo crear la cuenta. Revisá el email y probá de nuevo.");
      setLoading(false);
      return;
    }

    if (data.user && !data.user.identities?.length) {
      setError("Ese email ya tiene una cuenta. Usá un email nuevo para este grupo.");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/inicio");
      router.refresh();
      return;
    }

    setExito("La cuenta de admin y el grupo ya están creados. Revisá tu correo para confirmar la cuenta y después ingresá.");
    setLoading(false);
  }

  return (
    <div className="rounded-2xl p-7" style={{ background: "var(--g1)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className="text-xs" style={{ color: "var(--dim)" }}>Vas a administrar</p>
      <h2 className="bebas text-2xl" style={{ color: "var(--gold)" }}>{nombreGrupo}</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
        Creá tu cuenta. Vas a quedar como admin y podrás invitar a tus amigos desde la configuración del grupo.
      </p>

      <form onSubmit={registrar} className="mt-5 space-y-4">
        <Campo label="Email" refInput={emailRef} type="email" autoComplete="email" placeholder="tu@email.com" />
        <Campo label="Tu nombre real" refInput={nombreRef} type="text" autoComplete="name" placeholder="Ej: Mariano García" />
        <Campo label="Tu alias" refInput={aliasRef} type="text" autoComplete="nickname" placeholder="Cómo te verá el grupo" />
        <Campo label="Clave (6 caracteres o más)" refInput={claveRef} type="password" autoComplete="new-password" />
        <Campo label="Repetir clave" refInput={clave2Ref} type="password" autoComplete="new-password" />

        {error && <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(226,59,77,0.15)", color: "#ffc1c9" }}>{error}</p>}
        {exito && <p className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(242,182,50,0.15)", color: "var(--gold)" }}>{exito}</p>}

        {!exito && (
          <button type="submit" disabled={loading} className="w-full rounded-xl py-3 text-sm font-bold disabled:opacity-50" style={{ background: "var(--or)", color: "#fff" }}>
            {loading ? "Creando cuenta y grupo..." : "Crear mi cuenta de admin"}
          </button>
        )}
      </form>

      <p className="mt-5 border-t pt-4 text-center text-xs" style={{ borderColor: "rgba(255,255,255,0.08)", color: "var(--dim)" }}>
        ¿Ya tenés una cuenta? <Link href="/login" className="font-semibold" style={{ color: "var(--gold)" }}>Ingresar</Link>
      </p>
    </div>
  );
}

function Campo({
  label,
  refInput,
  type,
  autoComplete,
  placeholder,
}: {
  label: string;
  refInput: React.RefObject<HTMLInputElement | null>;
  type: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--dim)" }}>{label}</span>
      <input
        ref={refInput}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        maxLength={type === "text" ? 60 : undefined}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--tx)" }}
      />
    </label>
  );
}
