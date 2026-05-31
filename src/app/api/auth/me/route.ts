// GET /api/auth/me — usuario en sesión (o 401). Lo usa el front para el
// sidebar (avatar + nombre) y para decidir si muestra el link "Usuarios".
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  return NextResponse.json({ user }, { status: 200 });
});
