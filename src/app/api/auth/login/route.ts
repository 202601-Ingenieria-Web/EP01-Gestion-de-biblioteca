// POST /api/auth/login  — Body: { email, password }
//
// Delega la verificación a Supabase Auth. Si es correcta, Supabase setea las
// cookies de sesión y devolvemos el perfil con el rol de public.User.
import { NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { apiHandler } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.string().email("Email inválido.").trim().toLowerCase(),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const POST = apiHandler(async (req) => {
  const body = await req.json().catch(() => ({}));
  const { email, password } = LoginSchema.parse(body);

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Cualquier error de Supabase → 401 genérico para no revelar si el email existe.
  if (error || !data.user) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email o contraseña incorrectos.",
        },
      },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      enabled: true,
      deleted: true,
    },
  });

  if (!dbUser || dbUser.deleted || !dbUser.enabled) {
    // Estado inconsistente (Supabase dice sí, la app dice no): cerramos sesión
    // para limpiar las cookies recién emitidas y rechazamos.
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: {
          code: "ACCOUNT_DISABLED",
          message:
            "Tu cuenta no está habilitada en el sistema. Contacta al administrador.",
        },
      },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.image,
        role: dbUser.role,
      },
    },
    { status: 200 }
  );
});
