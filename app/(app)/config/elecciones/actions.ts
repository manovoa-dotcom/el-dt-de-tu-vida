"use server";
import { getCurrentGroupMembership } from "@/lib/group-context";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { crearNoticiaAuto } from "@/lib/news";

export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

const HORAS_VOTACION = 48;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, groupId: null, error: "No autenticado" };

  const membership = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!membership || membership.role !== "admin") {
    return { supabase, user, groupId: null, error: "Solo el admin puede hacer esto" };
  }

  return { supabase, user, groupId: membership.group_id, error: null };
}

// ────────────────────────────────────────────────────────────────
// Convocar elecciones
// ────────────────────────────────────────────────────────────────
export async function convocarElecciones(
  motivo: string
): Promise<ActionResult> {
  const { supabase, user, groupId, error } = await requireAdmin();
  if (error || !groupId || !user) return { ok: false, error: error ?? "Error" };

  // Verificar que no haya otra elección abierta
  const { data: abierta } = await supabase
    .from("elections")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "abierta")
    .maybeSingle();

  if (abierta) {
    return { ok: false, error: "Ya hay una elección en curso" };
  }

  // Temporada activa
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("group_id", groupId)
    .eq("status", "activa")
    .maybeSingle();

  const closesAt = new Date(Date.now() + HORAS_VOTACION * 60 * 60 * 1000);

  const { error: err } = await supabase.from("elections").insert({
    group_id: groupId,
    season_id: season?.id ?? null,
    status: "abierta",
    motivo: motivo.trim() || "Llamado por el admin",
    closes_at: closesAt.toISOString(),
    created_by: user.id,
  });

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al crear la elección" };
  }

  await crearNoticiaAuto({
    groupId,
    title: "🗳️ ¡Se vienen las elecciones!",
    body: `Votá al admin titular y al suplente de la temporada. Tenés ${HORAS_VOTACION} horas para votar.`,
    payload: { tipo: "elecciones" },
  });

  revalidatePath("/config/elecciones");
  revalidatePath("/elecciones");
  revalidatePath("/inicio");

  return { ok: true, message: "¡Elecciones convocadas!" };
}

// ────────────────────────────────────────────────────────────────
// Votar
// ────────────────────────────────────────────────────────────────
export async function votar(
  electionId: string,
  candidatoTitular: string,
  candidatoSuplente: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const miembro = await getCurrentGroupMembership(supabase, user.id, ["activo"]);

  if (!miembro) return { ok: false, error: "No estás activo" };

  if (candidatoTitular === candidatoSuplente) {
    return {
      ok: false,
      error: "El titular y el suplente no pueden ser la misma persona",
    };
  }

  // Verificar que la elección esté abierta
  const { data: eleccion } = await supabase
    .from("elections")
    .select("id, status, closes_at, group_id")
    .eq("id", electionId)
    .eq("group_id", miembro.group_id)
    .maybeSingle();

  if (!eleccion) return { ok: false, error: "Elección no encontrada" };
  if (eleccion.status !== "abierta") {
    return { ok: false, error: "La elección no está abierta" };
  }
  if (new Date() > new Date(eleccion.closes_at)) {
    return { ok: false, error: "La votación ya cerró" };
  }

  // Verificar que no haya votado ya
  const { data: previo } = await supabase
    .from("election_votes")
    .select("id")
    .eq("election_id", electionId)
    .eq("voter_member_id", miembro.id)
    .maybeSingle();

  if (previo) return { ok: false, error: "Ya votaste" };

  const { error: err } = await supabase.from("election_votes").insert({
    election_id: electionId,
    voter_member_id: miembro.id,
    candidato_titular_id: candidatoTitular,
    candidato_suplente_id: candidatoSuplente,
  });

  if (err) {
    console.error(err);
    return { ok: false, error: "Error al registrar tu voto" };
  }

  revalidatePath("/elecciones");
  revalidatePath("/inicio");
  return { ok: true, message: "¡Voto registrado!" };
}

// ────────────────────────────────────────────────────────────────
// Cerrar elección
// ────────────────────────────────────────────────────────────────
export async function cerrarElecciones(
  electionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: eleccion } = await supabase
    .from("elections")
    .select("id, group_id, round, status")
    .eq("id", electionId)
    .maybeSingle();

  if (!eleccion) return { ok: false, error: "Elección no encontrada" };
  if (eleccion.status !== "abierta") {
    return { ok: false, error: "La elección ya está cerrada" };
  }

  const { data: votos } = await supabase
    .from("election_votes")
    .select("candidato_titular_id, candidato_suplente_id")
    .eq("election_id", electionId);

  if (!votos || votos.length === 0) {
    await supabase
      .from("elections")
      .update({ status: "cancelada", closed_at: new Date().toISOString() })
      .eq("id", electionId);
    revalidatePath("/config/elecciones");
    revalidatePath("/elecciones");
    return { ok: false, error: "Nadie votó. Elección cancelada." };
  }

  // Contar votos
  const contar = (arr: string[]) => {
    const map = new Map<string, number>();
    for (const x of arr) map.set(x, (map.get(x) ?? 0) + 1);
    return map;
  };

  const titulares = contar(votos.map((v) => v.candidato_titular_id));
  const suplentes = contar(votos.map((v) => v.candidato_suplente_id));

  const maxTit = Math.max(...Array.from(titulares.values()));
  const maxSup = Math.max(...Array.from(suplentes.values()));

  const ganadoresTit = Array.from(titulares.entries())
    .filter(([, c]) => c === maxTit)
    .map(([id]) => id);
  const ganadoresSup = Array.from(suplentes.entries())
    .filter(([, c]) => c === maxSup)
    .map(([id]) => id);

  const empateTit = ganadoresTit.length > 1;
  const empateSup = ganadoresSup.length > 1;

  // Si hay empate en cualquiera → segunda vuelta entre los empatados
  if (empateTit || empateSup) {
    await supabase
      .from("elections")
      .update({
        status: "cerrada",
        closed_at: new Date().toISOString(),
        empate_titular: empateTit,
        empate_suplente: empateSup,
      })
      .eq("id", electionId);

    // Crear segunda vuelta
    const closesAt = new Date(Date.now() + HORAS_VOTACION * 60 * 60 * 1000);
    const { error: err2 } = await supabase.from("elections").insert({
      group_id: eleccion.group_id,
      round: eleccion.round + 1,
      status: "abierta",
      motivo: `Segunda vuelta: ${empateTit ? "titular" : ""}${empateTit && empateSup ? " y " : ""}${empateSup ? "suplente" : ""}`,
      closes_at: closesAt.toISOString(),
      created_by: user.id,
    });

    if (err2) {
      console.error(err2);
      return { ok: false, error: "Error al crear la segunda vuelta" };
    }

    await crearNoticiaAuto({
      group_id_unused_placeholder: true, // se ignora
      groupId: eleccion.group_id,
      title: "🗳️ Segunda vuelta",
      body: `Hay empate. Se hace una segunda vuelta entre los más votados.`,
    } as unknown as Parameters<typeof crearNoticiaAuto>[0]);

    revalidatePath("/config/elecciones");
    revalidatePath("/elecciones");
    return { ok: true, message: "Empate: segunda vuelta convocada" };
  }

  // Sin empate: aplicar ganadores
  const ganadorTitular = ganadoresTit[0];
  const ganadorSuplente = ganadoresSup[0];

  await supabase
    .from("elections")
    .update({
      status: "cerrada",
      closed_at: new Date().toISOString(),
      ganador_titular_id: ganadorTitular,
      ganador_suplente_id: ganadorSuplente,
    })
    .eq("id", electionId);

  // Aplicar: sacar admin de todos, poner titular y suplente
  await supabase
    .from("group_members")
    .update({ role: "miembro", admin_tipo: null })
    .eq("group_id", eleccion.group_id)
    .eq("role", "admin");

  await supabase
    .from("group_members")
    .update({ role: "admin", admin_tipo: "titular" })
    .eq("id", ganadorTitular);

  await supabase
    .from("group_members")
    .update({ role: "admin", admin_tipo: "suplente" })
    .eq("id", ganadorSuplente);

  await crearNoticiaAuto({
    groupId: eleccion.group_id,
    title: "👑 ¡Nuevos administradores!",
    body: `Se eligieron los admins de la temporada.`,
  });

  revalidatePath("/config/elecciones");
  revalidatePath("/elecciones");
  revalidatePath("/inicio");
  revalidatePath("/config");

  return { ok: true, message: "Elección cerrada. Nuevos admins asignados." };
}

// ────────────────────────────────────────────────────────────────
// Cancelar elección
// ────────────────────────────────────────────────────────────────
export async function cancelarEleccion(
  electionId: string
): Promise<ActionResult> {
  const { supabase, groupId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: err } = await supabase
    .from("elections")
    .update({ status: "cancelada", closed_at: new Date().toISOString() })
    .eq("id", electionId)
    .eq("group_id", groupId);

  if (err) return { ok: false, error: "Error al cancelar" };

  revalidatePath("/config/elecciones");
  revalidatePath("/elecciones");
  return { ok: true, message: "Elección cancelada" };
}