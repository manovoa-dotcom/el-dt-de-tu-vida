import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { enviarNotificacion } from "@/lib/push";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await enviarNotificacion([user.id], {
    title: "🎉 ¡Funciona!",
    body: "Esta es una notificación de prueba desde El DT de tu vida.",
    url: "/inicio",
  });

  return NextResponse.json({ ok: true });
}