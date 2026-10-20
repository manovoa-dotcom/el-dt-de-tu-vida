"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ImageCropper from "@/components/ImageCropper";
import { createClient } from "@/lib/supabase/client";
import { notificarNuevoPendiente } from "./actions";
type Grupo = { id: string; name: string; slug: string };

export default function UnirsePage() {
  const router = useRouter();
  const params = useParams();
  const slug = String(params.slug);

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [grupoLoading, setGrupoLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usarCuentaExistente, setUsarCuentaExistente] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  // Foto
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [aliasLive, setAliasLive] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);
  const realNameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const claveRef = useRef<HTMLInputElement>(null);
  const clave2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("groups")
        .select("id, name, slug")
        .eq("slug", slug)
        .maybeSingle();
      setGrupo(data);
      setGrupoLoading(false);
    })();
  }, [slug]);

  function abrirSelectorFoto() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function onCropConfirm(blob: Blob) {
    setPhotoBlob(blob);
    const url = URL.createObjectURL(blob);
    setPhotoPreview(url);
    setImageSrc(null);
  }

  async function handleCrear() {
    setError(null);

    const email = emailRef.current?.value.trim() ?? "";
    const realName = realNameRef.current?.value.trim() ?? "";
    const alias = aliasRef.current?.value.trim() ?? "";
    const clave = claveRef.current?.value ?? "";
    const clave2 = clave2Ref.current?.value ?? "";

    if (!email) return setError("Poné tu email");
    if (!usarCuentaExistente && realName.length < 2) return setError("Poné tu nombre real");
    if (alias.length < 2) return setError("El alias es muy corto");
    if (clave.length < 6)
      return setError("La clave necesita 6 caracteres mínimo");
    if (!usarCuentaExistente && clave !== clave2) return setError("Las claves no coinciden");

    const grupoActual = grupo;
    if (!grupoActual) return setError("No se pudo cargar el grupo. Recargá la página y probá de nuevo.");

    setLoading(true);
    const supabase = createClient();

    // Verificar alias
    const { data: disponible, error: errCheck } = await supabase.rpc(
      "check_alias_disponible",
      { p_slug: slug, p_alias: alias }
    );

    if (errCheck) {
      console.error(errCheck);
      setError("Error al verificar el alias. Probá de nuevo.");
      setLoading(false);
      return;
    }
    if (!disponible) {
      setError("Ese alias ya está en uso. Probá otro.");
      setLoading(false);
      return;
    }

    if (usarCuentaExistente) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: clave });
      if (loginError) {
        setError("No se pudo ingresar. Revisá el correo y la clave de esa cuenta.");
        setLoading(false);
        return;
      }

      const { error: joinError } = await supabase.rpc("accept_group_invite_for_existing_user", {
        p_group_id: grupoActual.id,
        p_display_name: alias,
      });
      if (joinError) {
        setError(joinError.message);
        setLoading(false);
        return;
      }

      try {
        await notificarNuevoPendiente(grupoActual.id, alias.trim());
      } catch (err) {
        console.error("Error notificando a admins:", err);
      }

      setSolicitudEnviada(true);
      setLoading(false);
      return;
    }

    // Crear cuenta nueva
    const { data: signUpData, error: errSignUp } = await supabase.auth.signUp({
      email,
      password: clave,
      options: {
        data: {
          display_name: alias,
          real_name: realName,
          group_slug: slug,
        },
      },
    });

    if (errSignUp) {
      console.error(errSignUp);
      setError("No se pudo crear la cuenta. Revisá el correo. Si ya tenés una cuenta, elegí “Ya tengo cuenta”.");
      setLoading(false);
      return;
    }

    if (signUpData.user && !signUpData.user.identities?.length) {
      setError("Ese correo ya tiene una cuenta. Elegí “Ya tengo cuenta” para entrar con ese mismo correo.");
      setLoading(false);
      return;
    }

    // Subir foto si hay
    if (photoBlob && signUpData.user) {
      const userId = signUpData.user.id;
      const path = `${userId}/avatar-${Date.now()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, photoBlob, { contentType: "image/jpeg", upsert: true });

      if (!upErr) {
        const { data: pub } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        await supabase
          .from("profiles")
          .update({ photo_url: pub.publicUrl })
          .eq("id", userId);
      } else {
        console.error("Error subiendo foto:", upErr);
        // no bloqueamos el registro por un error de foto
      }
    }

     // Notificar a los admins (no bloquea si falla)
    if (grupo) {
      try {
        await notificarNuevoPendiente(grupo.id, alias.trim());
      } catch (err) {
        console.error("Error notificando a admins:", err);
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      router.push("/inicio");
      router.refresh();
    } else {
      router.push("/login");
    }
  }

  if (grupoLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--g0)", color: "var(--dim)" }}
      >
        Cargando...
      </main>
    );
  }

  if (!grupo) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-5 text-center"
        style={{ background: "var(--g0)", color: "var(--tx)" }}
      >
        <div>
          <h1 className="bebas text-3xl">Grupo no encontrado</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
            El link no es válido o el grupo ya no existe.
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
        <div className="mb-6 text-center">
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--gold)" }}
          >
            Te invitaron a
          </p>
          <h1 className="bebas mt-1 text-4xl">{grupo.name}</h1>
        </div>

        <div
          className="rounded-2xl p-7"
          style={{
            background: "var(--g1)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <h2 className="bebas text-2xl">{usarCuentaExistente ? "Ingresar y pedir acceso" : "Crear cuenta"}</h2>

          {/* Foto */}
          {!usarCuentaExistente && <div className="mt-5 flex flex-col items-center">
            <button
              type="button"
              onClick={abrirSelectorFoto}
              className="relative"
            >
              <Avatar
                alias={aliasLive || "?"}
                photoUrl={photoPreview}
                size={92}
                ringColor="var(--gold)"
              />
              <div
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full text-sm"
                style={{
                  background: "var(--or)",
                  border: "2px solid var(--g1)",
                }}
              >
                📷
              </div>
            </button>
            <p className="mt-2 text-[11px]" style={{ color: "var(--dim)" }}>
              {photoPreview
                ? "Tocá para cambiar la foto"
                : "Subí una foto (opcional)"}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>}

          {solicitudEnviada ? (
            <div className="mt-5 rounded-xl p-4 text-sm" style={{ background: "rgba(242,182,50,0.12)", color: "var(--gold)" }}>
              Tu solicitud fue enviada. Cuando el admin la apruebe, este grupo aparecerá en el selector dentro de la aplicación.
              <Link href="/inicio" className="mt-3 block font-bold" style={{ color: "var(--gold)" }}>Volver a mis grupos</Link>
            </div>
          ) : <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCrear();
            }}
            noValidate
            className="mt-4 space-y-4"
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
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
            </div>

            {!usarCuentaExistente && <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--dim)" }}
              >
                Tu nombre real
              </label>
              <input
                ref={realNameRef}
                type="text"
                maxLength={60}
                autoComplete="name"
                name="real-name"
                placeholder="Ej: Mariano García"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
              <p className="mt-1 text-[11px]" style={{ color: "var(--dim)" }}>
                Solo lo ve el admin del grupo.
              </p>
            </div>}

            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--dim)" }}
              >
                Tu alias
              </label>
              <input
                ref={aliasRef}
                type="text"
                maxLength={30}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="alias"
                placeholder='Ej: "Mariano el RUSTICO"'
                onInput={(e) => setAliasLive((e.target as HTMLInputElement).value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
              <p className="mt-1 text-[11px]" style={{ color: "var(--dim)" }}>
                Así te ve todo el grupo. Debe ser único.
              </p>
            </div>

            <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--dim)" }}
              >
                {usarCuentaExistente ? "Clave de tu cuenta" : "Clave (6+ caracteres)"}
              </label>
              <input
                ref={claveRef}
                type="password"
                minLength={6}
                maxLength={30}
                autoComplete={usarCuentaExistente ? "current-password" : "new-password"}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="new-password"
                placeholder="••••••"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
            </div>

            {!usarCuentaExistente && <div>
              <label
                className="mb-1 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--dim)" }}
              >
                Repetir clave
              </label>
              <input
                ref={clave2Ref}
                type="password"
                minLength={6}
                maxLength={30}
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                name="confirm-password"
                placeholder="••••••"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--tx)",
                }}
              />
            </div>}

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
              onClick={handleCrear}
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-50"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              {loading ? (usarCuentaExistente ? "Ingresando..." : "Creando...") : (usarCuentaExistente ? "Ingresar y pedir acceso" : "Crear cuenta")}
            </button>
          </form>}

          {!solicitudEnviada && <button
            type="button"
            onClick={() => { setUsarCuentaExistente((actual) => !actual); setError(null); }}
            className="mt-4 w-full text-center text-sm font-semibold"
            style={{ color: "var(--gold)" }}
          >
            {usarCuentaExistente ? "Quiero crear una cuenta nueva" : "Ya tengo cuenta: entrar con mi correo"}
          </button>}

          <p
            className="mt-5 text-center text-xs leading-relaxed"
            style={{ color: "var(--dim)" }}
          >
            Un admin del grupo tiene que aprobar tu cuenta antes de que entres.
          </p>

          <div
            className="mt-5 border-t pt-4 text-center text-sm"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              color: "var(--dim)",
            }}
          >
            ¿Ya tenés cuenta? Usá la opción de arriba para entrar con tu correo sin crear otra cuenta.
          </div>
        </div>
      </div>

      {imageSrc && (
        <ImageCropper
          imageSrc={imageSrc}
          onConfirm={onCropConfirm}
          onCancel={() => setImageSrc(null)}
        />
      )}
    </main>
  );
}
