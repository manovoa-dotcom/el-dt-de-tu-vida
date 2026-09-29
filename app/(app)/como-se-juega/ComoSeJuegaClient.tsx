"use client";

import { useState } from "react";
import Link from "next/link";

type Seccion = {
  id: string;
  emoji: string;
  titulo: string;
  resumen: string;
  contenido: React.ReactNode;
  soloAdmin?: boolean;
};

export default function ComoSeJuegaClient({ isAdmin }: { isAdmin: boolean }) {
  const [abierta, setAbierta] = useState<string | null>("que-es");

  const secciones: Seccion[] = [
    {
      id: "que-es",
      emoji: "⚽",
      titulo: "¿Qué es esto?",
      resumen: "Un campeonato entre amigos",
      contenido: <ContenidoQueEs />,
    },
    {
      id: "anotarse",
      emoji: "✍️",
      titulo: "Anotarse al partido",
      resumen: "Confirmá si vas a jugar cada semana",
      contenido: <ContenidoAnotarse />,
    },
    {
      id: "equipo",
      emoji: "🎯",
      titulo: "Armar tu equipo",
      resumen: "Elegí titulares y suplente cada fecha",
      contenido: <ContenidoEquipo />,
    },
    {
      id: "puntajes",
      emoji: "📊",
      titulo: "Cómo se suman los puntos",
      resumen: "Los ítems que valen en cada partido",
      contenido: <ContenidoPuntajes />,
    },
    {
      id: "rankings",
      emoji: "🏆",
      titulo: "Rankings y premios",
      resumen: "DT de la fecha, Equipo Ideal y campeón",
      contenido: <ContenidoRankings />,
    },
    {
      id: "reglas",
      emoji: "📌",
      titulo: "Reglas importantes",
      resumen: "Bajas, faltas, invitados y fechas suspendidas",
      contenido: <ContenidoReglas />,
    },
    {
      id: "admin",
      emoji: "⚙️",
      titulo: "Si sos admin",
      resumen: "Cargar resultados, suspender fechas y más",
      contenido: <ContenidoAdmin />,
      soloAdmin: true,
    },
  ];

  const seccionesVisibles = secciones.filter(
    (s) => !s.soloAdmin || isAdmin
  );

  return (
    <div className="pb-8">
      <header className="flex items-center gap-3 px-4 pb-2 pt-6">
        <Link
          href="/inicio"
          className="text-xs no-underline"
          style={{ color: "var(--dim)" }}
        >
          ← Inicio
        </Link>
      </header>

      <h1 className="bebas px-4 text-3xl">Cómo se juega</h1>
      <p className="mt-1 px-4 text-xs" style={{ color: "var(--dim)" }}>
        Todo lo que necesitás saber para jugar
      </p>

      <div className="mt-4">
        {seccionesVisibles.map((s) => (
          <SeccionAcordeon
            key={s.id}
            seccion={s}
            abierta={abierta === s.id}
            onToggle={() => setAbierta(abierta === s.id ? null : s.id)}
          />
        ))}
      </div>

      <div className="mx-4 mt-8 rounded-2xl p-5 text-center"
           style={{ background: "linear-gradient(160deg, #1b4f39, #11352a)", border: "1px solid var(--gold)" }}>
        <div className="text-2xl">⚽</div>
        <p className="bebas mt-2 text-lg" style={{ color: "var(--gold)" }}>
          UN GRUPO. UN PARTIDO. UN CAMPEONATO.
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--tx)" }}>
          Todos juegan.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Acordeón
// ────────────────────────────────────────────────────────────────
function SeccionAcordeon({
  seccion,
  abierta,
  onToggle,
}: {
  seccion: Seccion;
  abierta: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="mx-3 mt-2 overflow-hidden rounded-2xl transition"
      style={{
        background: "var(--g1)",
        border: `1px solid ${abierta ? "rgba(242,182,50,0.4)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-2xl">{seccion.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{seccion.titulo}</div>
          <div className="text-[11px]" style={{ color: "var(--dim)" }}>
            {seccion.resumen}
          </div>
        </div>
        <span
          className="text-xs transition"
          style={{
            color: "var(--dim)",
            transform: abierta ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          ▼
        </span>
      </button>

      {abierta && (
        <div
          className="px-4 pb-4 pt-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {seccion.contenido}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Contenidos
// ────────────────────────────────────────────────────────────────
function Parrafo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tx)" }}>
      {children}
    </p>
  );
}

function Destacado({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-3 rounded-xl px-3 py-2 text-xs"
      style={{
        background: "rgba(242,182,50,0.1)",
        borderLeft: "3px solid var(--gold)",
        color: "var(--tx)",
      }}
    >
      {children}
    </div>
  );
}

function Lista({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-sm leading-relaxed"
          style={{ color: "var(--tx)" }}
        >
          <span style={{ color: "var(--gold)", flexShrink: 0 }}>•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function ContenidoQueEs() {
  return (
    <>
      <Parrafo>
        <strong>El DT de tu vida</strong> convierte el partido real de cada semana
        en un campeonato entre todos los del grupo.
      </Parrafo>
      <Parrafo>
        Cada integrante del grupo es un <strong>DT</strong>. Antes de cada fecha,
        elegís tu equipo de fantasía con los jugadores que van a la cancha.
      </Parrafo>
      <Destacado>
        No necesitás ir a jugar para participar. Aunque no vayas a la cancha esa
        semana, <strong>igual armás tu equipo</strong> y sumás puntos si tus
        jugadores rinden.
      </Destacado>
      <Parrafo>
        Al final del año, el DT con más puntos se corona <strong>Campeón</strong>.
      </Parrafo>
    </>
  );
}

function ContenidoAnotarse() {
  return (
    <>
      <Parrafo>
        Cada semana se abre la convocatoria para el partido. Si vas a ir, tenés
        que <strong>anotarte</strong>.
      </Parrafo>
      <Lista
        items={[
          <>
            <strong>Lugares limitados:</strong> el cupo lo define el admin (10, 12,
            14… según la cancha).
          </>,
          <>
            <strong>Lista de espera:</strong> si el cupo se llena, te anotás en la
            lista. Si alguien se da de baja, entrás automáticamente.
          </>,
          <>
            <strong>Darte de baja sin sanción:</strong> podés bajarte hasta 3 horas
            antes del partido.
          </>,
          <>
            <strong>Si faltás sin avisar</strong> te llevás una tarjeta roja 🟥 que
            resta en los premios de fin de año.
          </>,
        ]}
      />
      <Destacado>
        Anotate apenas se abre la convocatoria. Los lugares se llenan rápido.
      </Destacado>
    </>
  );
}

function ContenidoEquipo() {
  return (
    <>
      <Parrafo>
        Antes de cada fecha, elegís tu <strong>equipo de fantasía</strong> entre
        los que se anotaron para jugar.
      </Parrafo>
      <Lista
        items={[
          <>
            <strong>Titulares:</strong> la mitad del cupo. Si el cupo es 10, elegís 5.
            Si es 12, elegís 6.
          </>,
          <>
            <strong>Suplente:</strong> siempre 1 más. Solo suma si cubre a un titular
            que no fue.
          </>,
          <>
            <strong>Presupuesto:</strong> cada jugador tiene un valor. No podés
            gastar más de lo que te dan.
          </>,
          <>
            <strong>Podés elegirte a vos mismo</strong> si te anotaste para jugar.
          </>,
          <>
            <strong>Cierre:</strong> el equipo se cierra 10 minutos antes del
            partido.
          </>,
        ]}
      />
      <Destacado>
        El equipo se guarda solo. Cada cambio que hacés se guarda automáticamente.
      </Destacado>
    </>
  );
}

function ContenidoPuntajes() {
  return (
    <>
      <Parrafo>
        Los puntos los ganan los <strong>jugadores</strong> en la cancha. El DT
        suma los puntos de <strong>sus titulares</strong>.
      </Parrafo>
      <Parrafo>
        Cada grupo elige qué ítems valen y cuánto suman. Estos son los típicos:
      </Parrafo>
      <div
        className="mt-2 space-y-1 rounded-xl p-3"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {[
          ["⚽ Hizo gol", "1 pt"],
          ["🎯 Gol de cabeza", "1 pt"],
          ["🏆 Equipo ganador", "1 pt"],
          ["🥇 Primer gol del partido", "1 pt"],
          ["🥅 Último gol", "1 pt"],
          ["✨ Mejor gol", "1 pt"],
          ["⭐ Mejor jugador", "1 pt"],
          ["🧤 Mejor arquero", "1 pt"],
          ["🤝 Buen compañero", "1 pt"],
          ["🔥 Más garra", "1 pt"],
        ].map(([label, pts]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--tx)" }}>{label}</span>
            <span
              className="bebas text-sm"
              style={{ color: "var(--gold)" }}
            >
              {pts}
            </span>
          </div>
        ))}
      </div>
      <Parrafo>
        Los valores los puede ajustar el admin. Algunos ítems dan más puntos para
        evitar empates.
      </Parrafo>
      <Destacado>
        <strong>Valor de mercado:</strong> cada jugador tiene un "precio" que sube
        o baja según cuántos DTs lo eligen. Es el número que ves al lado de cada
        nombre cuando armás tu equipo.
      </Destacado>
    </>
  );
}

function ContenidoRankings() {
  return (
    <>
      <Parrafo>
        Cada fecha se corona un <strong>DT de la Fecha</strong> (el que más puntos
        sumó con su equipo) y un <strong>Equipo Ideal</strong> (los mejores
        jugadores de esa fecha).
      </Parrafo>
      <Lista
        items={[
          <>
            <strong>Ranking de DT:</strong> el acumulado de todos los DTs en la
            temporada.
          </>,
          <>
            <strong>Ranking de jugadores:</strong> podés filtrar por ítem (goleadores,
            mejor arquero, más garra, etc.).
          </>,
          <>
            <strong>Equipo Ideal de la Fecha:</strong> los que más puntos sacaron.
            Reciben +1 al valor de mercado para la fecha siguiente.
          </>,
          <>
            <strong>Equipo Ideal del Año:</strong> los mejores de la temporada
            completa, más el DT campeón.
          </>,
        ]}
      />
      <Destacado>
        Podés tocar cualquier jugador o DT en el ranking para ver su ficha con el
        detalle de sus puntos y tarjetas.
      </Destacado>
    </>
  );
}

function ContenidoReglas() {
  return (
    <>
      <Parrafo>
        <strong>Invitados.</strong> Alguien sin cuenta propia puede sumarse
        puntualmente. El admin los agrega desde Config, y podés elegirlos en tu
        equipo como a cualquier otro.
      </Parrafo>
      <Parrafo>
        <strong>Tarjetas rojas.</strong> Se ganan por faltar sin avisar. Se
        acumulan y pesan en los premios de fin de año: los que tienen menos,
        ganan. Si fue por una emergencia, el admin te la puede anular.
      </Parrafo>
      <Parrafo>
        <strong>Fecha suspendida.</strong> Si por lluvia o falta de cancha se
        suspende, no cuenta para el campeonato. Los equipos se anulan y hay que
        armarlos de nuevo para la fecha siguiente.
      </Parrafo>
      <Parrafo>
        <strong>Empates.</strong> Si dos DTs terminan con los mismos puntos, los
        dos ganan el mismo puesto. No hay desempate.
      </Parrafo>
    </>
  );
}

function ContenidoAdmin() {
  return (
    <>
      <Parrafo>
        Como admin tenés acceso a <strong>Config</strong>, desde donde se maneja
        todo:
      </Parrafo>
      <Lista
        items={[
          <>
            <strong>Cargar resultados:</strong> después de cada partido, elegís
            quién ganó cada ítem. Podés editar resultados de fechas pasadas.
          </>,
          <>
            <strong>Configuración del grupo:</strong> fecha/hora/lugar del partido,
            cupo, presupuesto, ítems activos.
          </>,
          <>
            <strong>Plantel y cuentas:</strong> aprobar nuevos usuarios, suspender
            o dar de baja jugadores, agregar invitados.
          </>,
          <>
            <strong>Suspender fecha:</strong> si se cae el partido por lluvia,
            feriado, etc.
          </>,
        ]}
      />
      <Destacado>
        El admin también tiene acceso al historial público de correcciones.
        Cualquier cambio que se haga queda registrado para que todo el grupo lo
        vea.
      </Destacado>
    </>
  );
}