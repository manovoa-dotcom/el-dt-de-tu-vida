"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ImageCropper from "@/components/ImageCropper";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  email: string;
  alias: string;
  realName: string;
  photoUrl: string | null;
  grupoNombre: string | null;
  bienvenida?: boolean;
};

export default function PerfilClient({
  userId,
  email,
  alias,
  realName,
  photoUrl,
  grupoNombre,
  bienvenida = false,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(photoUrl);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function abrirSelector() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      mostrarToast("La imagen no puede superar 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function onCropConfirm(blob: Blob) {
    setLoading(true);
    const supabase = createClient();
    const path = `${userId}/avatar-${Date.now()}.jpg`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });

    if (upErr) {
      console.error(upErr);
      setToast("Error al subir la imagen");
      setLoading(false);
      setImageSrc(null);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ photo_url: pub.publicUrl })
      .eq("id", userId);

    if (updErr) {
      console.error(updErr);
      setToast("Error al guardar el perfil");
      setLoading(false);
      setImageSrc(null);
      return;
    }

    setPhoto(pub.publicUrl);
    setImageSrc(null);
    setLoading(false);
    mostrarToast("¡Foto actualizada!");
    startTransition(() => {
      router.refresh();
    });
  }

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="pb-8">
      {toast && (
        <div
          className="fixed left-3 right-3 top-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-bold shadow-2xl"
          style={{ background: "var(--gold)", color: "#12261c" }}
        >
          {toast}
        </div>
      )}

      {bienvenida ? (
        <div
          className="mx-3 mt-4 rounded-2xl p-5 text-center"
          style={{
            background: "linear-gradient(160deg, #1b4f39, #11352a)",
            border: "1px solid var(--gold)",
          }}
        >
          <div className="text-4xl">🎉</div>
          <h2 className="bebas mt-2 text-2xl" style={{ color: "var(--gold)" }}>
            ¡BIENVENIDO AL CAMPEONATO!
          </h2>
          <p className="mt-2 text-xs" style={{ color: "var(--tx)" }}>
            Antes de arrancar, subí una foto para que tus rivales te reconozcan.
            Si querés, después podés cambiarla.
          </p>
        </div>
      ) : (
        <header className="flex items-center gap-3 px-4 pb-2 pt-6">
          <Link
            href="/inicio"
            className="text-xs no-underline"
            style={{ color: "var(--dim)" }}
          >
            ← Inicio
          </Link>
        </header>
      )}

      <h1 className="bebas px-4 pt-4 text-3xl">
        {bienvenida ? "" : "Perfil"}
      </h1>

      {/* Foto */}
      <div className="mt-5 flex flex-col items-center">
        <button
          type="button"
          onClick={abrirSelector}
          className="relative"
          disabled={loading}
        >
          <Avatar
            alias={alias}
            photoUrl={photo}
            size={120}
            ringColor="var(--gold)"
          />
          <div
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full text-base"
            style={{
              background: "var(--or)",
              border: "2px solid var(--g0)",
            }}
          >
            📷
          </div>
        </button>
        <p className="mt-2 text-xs" style={{ color: "var(--dim)" }}>
          Tocá para {photo ? "cambiar" : "subir"} tu foto
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* Datos */}
      <div className="mx-3 mt-6 rounded-2xl" style={{ background: "var(--g1)" }}>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--dim)" }}
          >
            Alias
          </span>
          <span className="text-sm font-bold">{alias}</span>
        </div>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--dim)" }}
          >
            Nombre real
          </span>
          <span className="text-sm">{realName || "—"}</span>
        </div>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--dim)" }}
          >
            Email
          </span>
          <span className="text-xs" style={{ color: "var(--dim)" }}>
            {email}
          </span>
        </div>
        {grupoNombre && (
          <div className="flex items-center justify-between px-4 py-3">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--dim)" }}
            >
              Grupo
            </span>
            <span className="text-sm">{grupoNombre}</span>
          </div>
        )}
      </div>

      {bienvenida ? (
        <div className="mx-3 mt-6">
          <Link
            href="/inicio"
            className="block w-full rounded-xl py-3 text-center text-sm font-bold no-underline"
            style={{ background: "var(--or)", color: "#fff" }}
          >
            {photo ? "Continuar al juego →" : "Saltar por ahora →"}
          </Link>
        </div>
      ) : (
        <div className="mx-3 mt-6">
          <button
            type="button"
            onClick={cerrarSesion}
            className="w-full rounded-xl border py-3 text-sm font-bold transition"
            style={{ borderColor: "var(--red)", color: "var(--red)" }}
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Cropper modal */}
      {imageSrc && (
        <ImageCropper
          imageSrc={imageSrc}
          onConfirm={onCropConfirm}
          onCancel={() => setImageSrc(null)}
          loading={loading}
        />
      )}
    </div>
  );
}