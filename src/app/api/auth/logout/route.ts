// POST /api/auth/logout — cierra sesión en Supabase y limpia cookies.
// Idempotente: devuelve 200 aunque no haya sesión activa.
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const POST = apiHandler(async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true }, { status: 200 });
});
