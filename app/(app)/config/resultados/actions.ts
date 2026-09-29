"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { crearNoticiaAuto } from "@/lib/news";

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
    .select("id, group_id, number, status")
    .eq("id", matchId)
    .eq("group_id", membership.group_id)
    .maybeSingle();

  if (!match) return { ok: false, error: "Partido no encontrado" };
  if (match.status !== "programada" && match.status !== "jugada") {
    return { ok: false, error: "El partido no está en estado para cargar resultados" };
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

  // DT de la fecha
  const { data: topDT } = await supabase
    .from("dt_scores")
    .select("dt_member_id, points, dt:group_members!dt_scores_dt_member_id_fkey(display_name)")
    .eq("match_id", matchId)
    .order("points", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topDT) {
    const dt = topDT.dt as unknown as { display_name: string } | null;
    if (dt) {
      await crearNoticiaAuto({
        groupId: membership.group_id,
        title: `🏆 DT de la Fecha ${match.number}: ${dt.display_name}`,
        body: `Sumó ${topDT.points} puntos con su equipo.`,
        payload: { match_id: matchId, member_id: topDT.dt_member_id },
      });
    }
  }

  // Equipo Ideal
  const { data: topJugadores } = await supabase
    .from("player_scores")
    .select("member_id, points, jugador:group_members!player_scores_member_id_fkey(display_name)")
    .eq("match_id", matchId)
    .gt("points", 0)
    .order("points", { ascending: false })
    .limit(5);

  if (topJugadores && topJugadores.length > 0) {
    const nombres = topJugadores
      .map((j) => {
        const m = j.jugador as unknown as { display_name: string } | null;
        return m?.display_name;
      })
      .filter((x): x is string => !!x)
      .join(", ");

    await crearNoticiaAuto({
      groupId: membership.group_id,
      title: `⭐ Equipo Ideal de la Fecha ${match.number}`,
      body: nombres,
      payload: { match_id: matchId },
    });
  }

  revalidatePath("/config/resultados");
  revalidatePath("/inicio");
  revalidatePath("/resultados");
  revalidatePath("/ranking");

  return { ok: true, message: "Resultados guardados y puntajes calculados" };
}