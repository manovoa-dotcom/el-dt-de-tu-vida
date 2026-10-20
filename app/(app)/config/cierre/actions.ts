"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

type PodioItem = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  total_points: number;
};

type PremioItem = {
  member_id: string;
  alias: string;
  photo_url: string | null;
  cantidad: number;
  extra?: string;
};

type ResumenCierre = {
  podio: PodioItem[];
  equipo_ideal: {
    dt: PodioItem | null;
    jugadores: PremioItem[];
  };
  premios: {
    goleador: PremioItem | null;
    mejor_arquero: PremioItem | null;
    mas_garra: PremioItem | null;
    buen_companero: PremioItem | null;
    tarjetas_rojas: PremioItem | null;
  };
  presentismo_sorpresa: PremioItem | null;
  fechas_jugadas: number;
  cerrado_at: string;
};

// ────────────────────────────────────────────────────────────────
// Cerrar la temporada activa
// ────────────────────────────────────────────────────────────────
export async function cerrarTemporada(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede cerrar la temporada" };
  }

  // Buscar la temporada activa
  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, group_id")
    .eq("group_id", membership.group_id)
    .eq("status", "activa")
    .maybeSingle();

  if (!season) {
    return { ok: false, error: "No hay temporada activa para cerrar" };
  }

  // Verificar que no haya partidos programados pendientes
  const { data: programado } = await supabase
    .from("matches")
    .select("id, number")
    .eq("season_id", season.id)
    .eq("status", "programada")
    .limit(1)
    .maybeSingle();

  if (programado) {
    return {
      ok: false,
      error: `Todavía hay un partido programado (Fecha ${programado.number}). Cargá los resultados o suspendé la fecha antes de cerrar.`,
    };
  }

  // Traer partidos jugados/cerrados
  const { data: partidos } = await supabase
    .from("matches")
    .select("id, number")
    .eq("season_id", season.id)
    .in("status", ["jugada", "cerrada"]);

  const partidosIds = (partidos ?? []).map((p) => p.id);
  const fechasJugadas = partidosIds.length;

  // ─── Podio DT ───
  let dtScores: { dt_member_id: string; points: number }[] = [];
  if (partidosIds.length > 0) {
    const { data } = await supabase
      .from("dt_scores")
      .select("dt_member_id, points")
      .in("match_id", partidosIds);
    dtScores = data ?? [];
  }

  const dtTotales = new Map<string, number>();
  for (const s of dtScores) {
    dtTotales.set(s.dt_member_id, (dtTotales.get(s.dt_member_id) ?? 0) + s.points);
  }

  const { data: miembros } = await supabase
    .from("group_members")
    .select("id, display_name, user_id, status")
    .eq("group_id", membership.group_id);

  const userIds = (miembros ?? [])
    .map((m) => m.user_id)
    .filter((x): x is string => !!x);

  let perfiles: Record<string, { photo_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, photo_url")
      .in("id", userIds);
    perfiles = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, { photo_url: p.photo_url }])
    );
  }

  const miembrosMap = new Map(
    (miembros ?? []).map((m) => [
      m.id,
      {
        alias: m.display_name,
        is_invitado: m.status === "invitado",
        photo_url: m.user_id ? perfiles[m.user_id]?.photo_url ?? null : null,
      },
    ])
  );

  const podio: PodioItem[] = Array.from(dtTotales.entries())
    .map(([mid, pts]) => {
      const info = miembrosMap.get(mid);
      return {
        member_id: mid,
        alias: info?.alias ?? "—",
        photo_url: info?.photo_url ?? null,
        total_points: pts,
      };
    })
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, 3);

  // ─── Equipo Ideal del Año ───
  const { data: grupo } = await supabase
    .from("groups")
    .select("equipo_ideal_anio_size")
    .eq("id", membership.group_id)
    .single();

  const idealSize = grupo?.equipo_ideal_anio_size ?? 5;

  // Puntos por jugador
  let itemWins: { member_id: string; item_id: string }[] = [];
  if (partidosIds.length > 0) {
    const { data } = await supabase
      .from("match_item_wins")
      .select("member_id, item_id")
      .in("match_id", partidosIds);
    itemWins = data ?? [];
  }

  const { data: items } = await supabase
    .from("items")
    .select("id, key, points")
    .eq("group_id", membership.group_id);

  const itemsMap = new Map(
    (items ?? []).map((i) => [i.id, { key: i.key, points: i.points }])
  );

  const jugadorPuntos = new Map<string, number>();
  const jugadorPorItem = new Map<string, Map<string, number>>();

  for (const w of itemWins) {
    const item = itemsMap.get(w.item_id);
    if (!item) continue;
    jugadorPuntos.set(
      w.member_id,
      (jugadorPuntos.get(w.member_id) ?? 0) + item.points
    );
    if (!jugadorPorItem.has(w.member_id)) {
      jugadorPorItem.set(w.member_id, new Map());
    }
    const mapa = jugadorPorItem.get(w.member_id)!;
    mapa.set(item.key, (mapa.get(item.key) ?? 0) + 1);
  }

  const topJugadores: PremioItem[] = Array.from(jugadorPuntos.entries())
    .map(([mid, pts]) => {
      const info = miembrosMap.get(mid);
      return {
        member_id: mid,
        alias: info?.alias ?? "—",
        photo_url: info?.photo_url ?? null,
        cantidad: pts,
      };
    })
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, idealSize);

  // ─── Premios por ítem ───
  function mejorEnItem(key: string): PremioItem | null {
    let mejor: { member_id: string; cantidad: number } | null = null;
    for (const [mid, mapa] of jugadorPorItem.entries()) {
      const c = mapa.get(key) ?? 0;
      if (c > 0 && (!mejor || c > mejor.cantidad)) {
        mejor = { member_id: mid, cantidad: c };
      }
    }
    if (!mejor) return null;
    const info = miembrosMap.get(mejor.member_id);
    return {
      member_id: mejor.member_id,
      alias: info?.alias ?? "—",
      photo_url: info?.photo_url ?? null,
      cantidad: mejor.cantidad,
    };
  }

  // ─── Tarjetas rojas ───
  let cardsRaw: { member_id: string }[] = [];
  if (partidosIds.length > 0) {
    const { data } = await supabase
      .from("cards")
      .select("member_id")
      .in("match_id", partidosIds)
      .eq("annulled", false);
    cardsRaw = data ?? [];
  }

  const tarjetasMap = new Map<string, number>();
  for (const c of cardsRaw) {
    tarjetasMap.set(c.member_id, (tarjetasMap.get(c.member_id) ?? 0) + 1);
  }
  let tarjetasPeor: PremioItem | null = null;
  for (const [mid, cant] of tarjetasMap.entries()) {
    if (!tarjetasPeor || cant > tarjetasPeor.cantidad) {
      const info = miembrosMap.get(mid);
      tarjetasPeor = {
        member_id: mid,
        alias: info?.alias ?? "—",
        photo_url: info?.photo_url ?? null,
        cantidad: cant,
      };
    }
  }

  // ─── Presentismo sorpresa: fechas seguidas sin fallar ───
  let asistenciasRaw: { member_id: string; match_id: string; status: string }[] = [];
  if (partidosIds.length > 0) {
    const { data } = await supabase
      .from("attendance")
      .select("member_id, match_id, status")
      .in("match_id", partidosIds);
    asistenciasRaw = data ?? [];
  }

  const partidoOrden = new Map(
    (partidos ?? []).map((p) => [p.id, p.number])
  );

  const asistenciaPorMiembro = new Map<string, { match_id: string; status: string }[]>();
  for (const a of asistenciasRaw) {
    if (!asistenciaPorMiembro.has(a.member_id)) {
      asistenciaPorMiembro.set(a.member_id, []);
    }
    asistenciaPorMiembro.get(a.member_id)!.push({
      match_id: a.match_id,
      status: a.status,
    });
  }

  // Orden de fechas (de menor a mayor)
  const partidosOrdenados = [...(partidos ?? [])].sort(
    (a, b) => a.number - b.number
  );

  let mejorRacha = 0;
  const rachas: { member_id: string; racha: number }[] = [];
  for (const [mid, asistencias] of asistenciaPorMiembro.entries()) {
    const estado = new Map(asistencias.map((a) => [a.match_id, a.status]));
    let rachaActual = 0;
    let mejorPropia = 0;
    for (const p of partidosOrdenados) {
      const est = estado.get(p.id);
      if (est === "presente") {
        rachaActual++;
        if (rachaActual > mejorPropia) mejorPropia = rachaActual;
      } else {
        rachaActual = 0;
      }
    }
    rachas.push({ member_id: mid, racha: mejorPropia });
    if (mejorPropia > mejorRacha) mejorRacha = mejorPropia;
  }

  const ganadoresPresentismo = rachas.filter((r) => r.racha === mejorRacha && r.racha > 0);
  let presentismoSorpresa: PremioItem | null = null;
  if (ganadoresPresentismo.length > 0) {
    const primero = ganadoresPresentismo[0];
    const info = miembrosMap.get(primero.member_id);
    presentismoSorpresa = {
      member_id: primero.member_id,
      alias:
        ganadoresPresentismo.length > 1
          ? ganadoresPresentismo
              .map((g) => miembrosMap.get(g.member_id)?.alias ?? "—")
              .join(", ")
          : info?.alias ?? "—",
      photo_url: info?.photo_url ?? null,
      cantidad: mejorRacha,
      extra:
        ganadoresPresentismo.length > 1
          ? `${ganadoresPresentismo.length} empatados`
          : undefined,
    };
  }

  // ─── Armar resumen ───
  const resumen: ResumenCierre = {
    podio,
    equipo_ideal: {
      dt: podio[0] ?? null,
      jugadores: topJugadores,
    },
    premios: {
      goleador: mejorEnItem("hizo_gol"),
      mejor_arquero: mejorEnItem("mejor_arquero"),
      mas_garra: mejorEnItem("mas_garra"),
      buen_companero: mejorEnItem("buen_companero"),
      tarjetas_rojas: tarjetasPeor,
    },
    presentismo_sorpresa: presentismoSorpresa,
    fechas_jugadas: fechasJugadas,
    cerrado_at: new Date().toISOString(),
  };

  // ─── Guardar el cierre ───
  const { error } = await supabase
    .from("seasons")
    .update({
      status: "cerrada",
      closed_at: new Date().toISOString(),
      closed_by: user.id,
      resumen_cierre: resumen,
    })
    .eq("id", season.id);

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al cerrar la temporada" };
  }

  revalidatePath("/config");
  revalidatePath("/config/cierre");
  revalidatePath("/inicio");
  revalidatePath("/ranking");
  revalidatePath("/resultados");

  return { ok: true, message: "Temporada cerrada con éxito" };
}

// ────────────────────────────────────────────────────────────────
// Iniciar nueva temporada
// ────────────────────────────────────────────────────────────────
export async function iniciarNuevaTemporada(
  nombre: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede iniciar una temporada" };
  }

  const trimmed = nombre.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "El nombre de la temporada es muy corto" };
  }

  // Verificar que no haya una temporada activa
  const { data: activa } = await supabase
    .from("seasons")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "activa")
    .maybeSingle();

  if (activa) {
    return {
      ok: false,
      error: "Ya hay una temporada activa. Cerrala antes de iniciar una nueva.",
    };
  }

  // Verificar que la última esté cerrada
  const { data: ultimaCerrada } = await supabase
    .from("seasons")
    .select("id")
    .eq("group_id", membership.group_id)
    .eq("status", "cerrada")
    .order("closed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ultimaCerrada) {
    return {
      ok: false,
      error: "Todavía no cerraste ninguna temporada. Primero cerrá la actual.",
    };
  }

  // Crear la nueva temporada
  const { error } = await supabase.from("seasons").insert({
    group_id: membership.group_id,
    name: trimmed,
    status: "activa",
  });

  if (error) {
    console.error(error);
    return { ok: false, error: "Error al crear la temporada" };
  }

  revalidatePath("/config");
  revalidatePath("/config/cierre");
  revalidatePath("/inicio");
  revalidatePath("/ranking");

  return { ok: true, message: "¡Temporada nueva iniciada!" };
}