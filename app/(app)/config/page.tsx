import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (membership?.role !== "admin") {
    return (
      <div className="p-6">
        <h1 className="bebas text-3xl">Config</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--dim)" }}>
          Solo el admin puede ver esta pantalla.
        </p>
      </div>
    );
  }

  const opciones = [
    {
      href: "/config/partido",
      icon: "📅",
      title: "Próximo partido",
      sub: "Fecha, hora, lugar, cupo y presupuesto",
    },
    {
  href: "/config/plantel",
  icon: "👥",
  title: "Plantel y cuentas",
  sub: "Aprobar, suspender, dar de baja, agregar invitados",
    },
    {
      href: "/config/items",
      icon: "⚽",
      title: "Ítems y puntos",
      sub: "Qué suma puntos y cuánto vale cada uno",      
    },
    {
      href: "/config/resultados",
      icon: "📝",
      title: "Cargar resultados",
      sub: "Puntos por ítem de la última fecha",
    },
    {
      href: "/config/grupo",
      icon: "⚙️",
      title: "Configuración del grupo",
      sub: "Nombre, link, valores de mercado del campeonato",
    },
    {
      href: "/config/elecciones",
      icon: "🗳️",
      title: "Elecciones de admins",
      sub: "Llamar a elecciones para titular y suplente",
      disabled: true,
    },
    {
      href: "/config/suspender",
      icon: "⏸️",
      title: "Suspender fecha",
      sub: "Anula equipos armados · no cambia cotizaciones",
    },
    {
      href: "/config/cierre",
      icon: "🏁",
      title: "Cierre de temporada",
      sub: "Resumen del año, campeón, salón de la fama",
    },
    {
      href: "/config/correcciones",
      icon: "📋",
      title: "Historial de correcciones",
      sub: "Cambios que hizo el admin (visible para el grupo)",
    },
  ];

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <h1 className="bebas text-3xl">Config</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--dim)" }}>
          Panel de administración
        </p>
      </header>

      <div className="mt-3">
        {opciones.map((op) =>
          op.disabled ? (
            <div
              key={op.href}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                opacity: 0.4,
              }}
            >
              <span className="text-xl">{op.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{op.title}</div>
                <div className="text-xs" style={{ color: "var(--dim)" }}>
                  {op.sub}
                </div>
              </div>
              <span style={{ color: "var(--dim)" }}>›</span>
            </div>
          ) : (
            <Link
              key={op.href}
              href={op.href}
              className="flex items-center gap-3 px-4 py-3 no-underline"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                color: "var(--tx)",
              }}
            >
              <span className="text-xl">{op.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{op.title}</div>
                <div className="text-xs" style={{ color: "var(--dim)" }}>
                  {op.sub}
                </div>
              </div>
              <span style={{ color: "var(--dim)" }}>›</span>
            </Link>
          )
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}