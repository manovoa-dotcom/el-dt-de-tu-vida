"use client";

import { usePushNotifications } from "./usePushNotifications";

export default function BotonNotificaciones() {
  const { isSupported, subscription, loading, error, subscribe } =
    usePushNotifications();

  // Mientras carga, no mostramos nada
  if (loading) return null;

  // Si no está soportado, no mostramos nada
  if (!isSupported) return null;

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