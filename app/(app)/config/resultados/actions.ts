"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { crearNoticiaAuto } from "@/lib/news";
import { getFraseNoUsada } from "@/lib/phrases";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

type Win = {
  item_id: string;
  member_ids: string[];
};

export async function guardarResultados(
  matchId: string,
  wins: Win[],
  faltas: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("user_id", user.id)
    .eq("status", "activo")
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    return { ok: false, error: "Solo el admin puede cargar resultados" };
  }

 const { data: match } = await supabase
    .from("matches")
    .select("id, group_id, number, status, season_id, kickoff_at")
    .eq("id", matchId)
    .eq("group_id", membership.group_id)
    .maybeSingle();

    if (!match) return { ok: false, error: "Partido no encontrado" };
  if (match.status !== "programada" && match.status !== "jugada") {
    return { ok: false, error: "El partido no está en estado para cargar resultados" };
  }

  // No se pueden cargar resultados antes de que el partido se haya jugado
  if (match.status === "programada") {
    const ahora = new Date();
    const kickoff = new Date(match.kickoff_at);
    if (kickoff > ahora) {
      return {
        ok: false,
        error: "El partido todavía no se jugó. Esperá a la hora del partido.",
      };
    }
  }

  // 1. Borrar items anteriores (por si se re-edita)
  await supabase.from("match_item_wins").delete().eq("match_id", matchId);

  // 2. Insertar nuevos
  const winsToInsert: { match_id: string; item_id: string; member_id: string }[] = [];
  for (const w of wins) {
    for (const m of w.member_ids) {
      winsToInsert.push({ match_id: matchId, item_id: w.item_id, member_id: m });
    }
  }
  if (winsToInsert.length > 0) {
    const { error: errWins } = await supabase
      .from("match_item_wins")
      .insert(winsToInsert);
    if (errWins) {
      console.error(errWins);
      return { ok: false, error: "Error al guardar ítems" };
    }
  }

  // 3. Faltas sin aviso
  await supabase.from("cards").delete().eq("match_id", matchId);

  if (faltas.length > 0) {
    await supabase
      .from("attendance")
      .update({ status: "ausente_sin_aviso" })
      .eq("match_id", matchId)
      .in("member_id", faltas);

    const cards = faltas.map((m) => ({
      match_id: matchId,
      member_id: m,
      reason: "Faltó sin aviso",
    }));
    const { error: errCards } = await supabase.from("cards").insert(cards);
    if (errCards) console.error(errCards);
  }

  // 4. Recalcular puntajes
  const { error: errCalc } = await supabase.rpc("calcular_puntajes", {
    p_match_id: matchId,
  });
  if (errCalc) {
    console.error(errCalc);
    return { ok: false, error: "Error al calcular puntajes" };
  }

  // 5. Marcar partido como jugado
  await supabase.from("matches").update({ status: "jugada" }).eq("id", matchId);

  // 6. Noticias automáticas
  await crearNoticiaAuto({
    groupId: membership.group_id,
    title: `📊 Resultados cargados · Fecha ${match.number}`,
    body: "Ya podés ver los puntajes en la pestaña Resultados.",
    payload: { match_id: matchId, match_number: match.number },
  });

    // ══════════════════════════════════════════════════════════════
  // Noticias con frases de conferencia
  // ══════════════════════════════════════════════════════════════

  // ─── DT de la Fecha ───
  const { data: topDT } = await supabase
    .from("dt_scores")
    .select("dt_member_id, points")
    .eq("match_id", matchId)
    .order("points", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topDT && topDT.points > 0) {
    const { data: dtInfo } = await supabase
      .from("group_members")
      .select("display_name")
      .eq("id", topDT.dt_member_id)
      .maybeSingle();

    if (dtInfo) {
      const frase = await getFraseNoUsada("dt_fecha");
      const cuerpo = frase
        ? `El DT ${dtInfo.display_name} declaró ante la prensa:\n\n"${frase}"`
        : `Sumó ${topDT.points} puntos con su equipo.`;

      await crearNoticiaAuto({
        groupId: membership.group_id,
        title: `🏆 DT de la Fecha ${match.number}: ${dtInfo.display_name}`,
        body: cuerpo,
        payload: { match_id: matchId, member_id: topDT.dt_member_id },
      });
    }
  }

  // ─── DT que salió último ───
  const { data: bottomDT } = await supabase
    .from("dt_scores")
    .select("dt_member_id, points")
    .eq("match_id", matchId)
    .order("points", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (
    bottomDT &&
    topDT &&
    bottomDT.dt_member_id !== topDT.dt_member_id
  ) {
    const { data: dtInfo } = await supabase
      .from("group_members")
      .select("display_name")
      .eq("id", bottomDT.dt_member_id)
      .maybeSingle();

    if (dtInfo) {
      const frase = await getFraseNoUsada("dt_ultimo");
      const cuerpo = frase
        ? `El DT ${dtInfo.display_name} declaró ante la prensa:\n\n"${frase}"`
        : `Sumó ${bottomDT.points} puntos con su equipo.`;

      await crearNoticiaAuto({
        groupId: membership.group_id,
        title: `😔 Último de la Fecha ${match.number}: ${dtInfo.display_name}`,
        body: cuerpo,
        payload: { match_id: matchId, member_id: bottomDT.dt_member_id },
      });
    }
  }

  // ─── Jugador del partido (el que más puntos sacó) ───
  const { data: topJugador } = await supabase
    .from("player_scores")
    .select("member_id, points")
    .eq("match_id", matchId)
    .gt("points", 0)
    .order("points", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topJugador && topJugador.points > 0) {
    const { data: jInfo } = await supabase
      .from("group_members")
      .select("display_name")
      .eq("id", topJugador.member_id)
      .maybeSingle();

    if (jInfo) {
      const frase = await getFraseNoUsada("jugador_partido");
      const cuerpo = frase
        ? `El jugador ${jInfo.display_name} declaró ante la prensa:\n\n"${frase}"`
        : `Sumó ${topJugador.points} puntos en el partido.`;

      await crearNoticiaAuto({
        groupId: membership.group_id,
        title: `⭐ Jugador del partido · Fecha ${match.number}: ${jInfo.display_name}`,
        body: cuerpo,
        payload: { match_id: matchId, member_id: topJugador.member_id },
      });
    }
  }

  // ─── Frases por ítem (Mejor gol, Mejor arquero, etc.) ───
  const categoriasPorItem: Record<string, string> = {
    mejor_gol: "mejor_gol",
    mejor_arquero: "mejor_arquero",
    buen_companero: "buen_companero",
    mas_garra: "mas_garra",
  };

  for (const [itemKey, categoriaFrase] of Object.entries(categoriasPorItem)) {
    // Buscar el item por su key
    const { data: item } = await supabase
      .from("items")
      .select("id, label")
      .eq("group_id", membership.group_id)
      .eq("key", itemKey)
      .eq("active", true)
      .maybeSingle();

    if (!item) continue;

    // Buscar quién ganó ese item en esta fecha
    const { data: ganador } = await supabase
      .from("match_item_wins")
      .select("member_id")
      .eq("match_id", matchId)
      .eq("item_id", item.id)
      .limit(1)
      .maybeSingle();

    if (!ganador) continue;

    const { data: gInfo } = await supabase
      .from("group_members")
      .select("display_name")
      .eq("id", ganador.member_id)
      .maybeSingle();

    if (!gInfo) continue;

    const frase = await getFraseNoUsada(categoriaFrase);
    if (!frase) continue;

    const cuerpo = `El jugador ${gInfo.display_name} declaró ante la prensa:\n\n"${frase}"`;

    await crearNoticiaAuto({
      groupId: membership.group_id,
      title: `🎯 ${item.label} · Fecha ${match.number}: ${gInfo.display_name}`,
      body: cuerpo,
      payload: { match_id: matchId, member_id: ganador.member_id, item_key: itemKey },
    });
  }

  // Equipo Ideal
  const { data: topJugadores } = await supabase
    .from("player_scores")
    .select("member_id, points")
    .eq("match_id", matchId)
    .gt("points", 0)
    .order("points", { ascending: false })
    .limit(5);

  if (topJugadores && topJugadores.length > 0) {
    const ids = topJugadores.map((j) => j.member_id);
    const { data: nombresRaw } = await supabase
      .from("group_members")
      .select("id, display_name")
      .in("id", ids);

    const nombresMap = new Map(
      (nombresRaw ?? []).map((n) => [n.id, n.display_name])
    );
    const nombres = topJugadores
      .map((j) => nombresMap.get(j.member_id))
      .filter((x): x is string => !!x)
      .join(", ");

    if (nombres) {
      await crearNoticiaAuto({
        groupId: membership.group_id,
        title: `⭐ Equipo Ideal de la Fecha ${match.number}`,
        body: nombres,
        payload: { match_id: matchId },
      });
    }
  }

  // 7. Recalcular valor de mercado para la próxima fecha programada
  const { data: proximoPartido } = await supabase
    .from("matches")
    .select("id")
    .eq("season_id", match.season_id)
    .eq("status", "programada")
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (proximoPartido) {
    await supabase.rpc("calcular_valor_mercado", {
      p_match_id: proximoPartido.id,
    });
  }

  revalidatePath("/config/resultados");
  revalidatePath("/inicio");
  revalidatePath("/resultados");
  revalidatePath("/ranking");
  revalidatePath("/convocatoria");

  return { ok: true, message: "Resultados guardados y puntajes calculados" };
}