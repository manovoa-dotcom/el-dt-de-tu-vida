"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "./usePushNotifications";

export default function NotificacionesPrompt({ memberId }: { memberId: string }) {
  const { isSupported, subscription, loading, error, permission, subscribe } =
    usePushNotifications();
  const [visible, setVisible] = useState(false);

  const storageKey = `el_dt_push_prompt_dismissed:${memberId}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(sessionStorage.getItem(storageKey) !== "1");
    }, 0);
    return () => clearTimeout(timer);
  }, [storageKey]);

  function cerrar() {
    sessionStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (
    !visible ||
    loading ||
    !isSupported ||
    subscription ||
    permission === "granted"
  ) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-5"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={cerrar}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-prompt-title"
        aria-describedby="push-prompt-description"
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
        style={{
          background: "var(--g1)",
          border: "1px solid rgba(242,182,50,0.5)",
          color: "var(--tx)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-4xl" aria-hidden="true">🔔</div>
          <h2
            id="push-prompt-title"
            className="bebas mt-2 text-2xl tracking-wide"
            style={{ color: "var(--gold)" }}
          >
            ¡Enterate de las novedades!
          </h2>
          <p
            id="push-prompt-description"
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--dim)" }}
          >
            Activá las notificaciones para recibir avisos importantes del grupo,
            como resultados y novedades del partido.
          </p>
        </div>

        {permission === "denied" ? (
          <p
            className="mt-4 rounded-xl p-3 text-xs"
            style={{ background: "rgba(242,182,50,0.1)", color: "var(--tx)" }}
          >
            El navegador ya bloqueó este permiso. Para activarlas, cambiá el
            permiso de notificaciones de este sitio desde la configuración del
            navegador.
          </p>
        ) : (
          <>
            {error && (
              <p className="mt-3 text-center text-xs" style={{ color: "var(--red)" }}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={subscribe}
              className="mt-5 w-full rounded-xl py-3 text-sm font-bold"
              style={{ background: "var(--or)", color: "#fff" }}
            >
              Activar notificaciones
            </button>
          </>
        )}

        <button
          type="button"
          onClick={cerrar}
          className="mt-3 w-full rounded-xl border py-2.5 text-sm"
          style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--dim)" }}
        >
          Ahora no
        </button>
      </section>
    </div>
  );
}
