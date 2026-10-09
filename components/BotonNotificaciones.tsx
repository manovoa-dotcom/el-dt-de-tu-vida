"use client";

import { usePushNotifications } from "./usePushNotifications";

export default function BotonNotificaciones() {
  const { isSupported, subscription, loading, error, subscribe } =
    usePushNotifications();

   // Mientras carga, mostramos un texto de diagnóstico
  if (loading) {
    return (
      <span className="text-xs" style={{ color: "var(--dim)" }}>
        🔔 Cargando...
      </span>
    );
  }

  // Si no está soportado, mostramos un texto de diagnóstico
  if (!isSupported) {
    return (
      <span className="text-xs" style={{ color: "var(--red)" }}>
        🔔 No soportado
      </span>
    );
  }

  // Si ya está suscrito, mostramos el estado
  if (subscription) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs"
        style={{ color: "var(--gold)" }}
      >
        🔔 Activadas
      </span>
    );
  }

  // Botón para activar
  return (
    <button
      type="button"
      onClick={subscribe}
      className="inline-flex items-center gap-1 text-xs underline transition"
      style={{ color: "var(--gold)", background: "transparent", border: "none" }}
    >
      🔔 Activar notificaciones
      {error && <span style={{ color: "var(--red)" }}> · {error}</span>}
    </button>
  );
}