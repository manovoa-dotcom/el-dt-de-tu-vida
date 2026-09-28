import Link from "next/link";

export default function RegistroPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-5 text-center"
      style={{
        background: "var(--g0)",
        backgroundImage:
          "radial-gradient(circle at 80% -10%, #1e6a47 0, transparent 45%)",
        color: "var(--tx)",
      }}
    >
      <div className="max-w-sm">
        <div className="text-5xl">🔗</div>
        <h1 className="bebas mt-4 text-3xl">Necesitás un link de invitación</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--dim)" }}>
          Para entrar a un grupo, pedile a alguien que ya esté adentro que te
          comparta el link de invitación del grupo.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl px-5 py-2 text-sm font-bold"
          style={{ background: "var(--or)", color: "#fff" }}
        >
          Volver al login
        </Link>
      </div>
    </main>
  );
}