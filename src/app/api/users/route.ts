// GET  /api/users — lista usuarios (solo ADMIN)
// POST /api/users — crea un usuario en Supabase Auth y su espejo (solo ADMIN)
//
// El alta se hace vía la admin API de Supabase (service-role key) y se espeja
// en public.User con el mismo UUID como PK.
import { NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const GET = apiHandler(async () => {
  await requireAdmin();

  const users = await prisma.user.findMany({
    where: { deleted: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users }, { status: 200 });
});

const CreateUserSchema = z.object({
  email: z.string().email("Email inválido.").trim().toLowerCase(),
  // Supabase exige 6+ caracteres; pedimos 8+ como mínimo más fuerte.
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  image: z.string().url("La URL de la foto no es válida.").optional().nullable(),
  role: z.enum(["ADMIN", "USER"], {
    message: "El rol debe ser ADMIN o USER.",
  }),
});

export const POST = apiHandler(async (req) => {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const data = CreateUserSchema.parse(body);

  const supabaseAdmin = createSupabaseAdminClient();

  // 1. Crear el usuario en Supabase Auth (hashea la contraseña).
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // omite el flujo de verificación por email
    user_metadata: { name: data.name },
  });

  if (error || !created.user) {
    // La causa más común es un email duplicado.
    const isDuplicate = /already (registered|been registered|exists)/i.test(
      error?.message ?? ""
    );
    return NextResponse.json(
      {
        error: {
          code: isDuplicate ? "EMAIL_TAKEN" : "AUTH_CREATE_FAILED",
          message: isDuplicate
            ? "Ya existe una cuenta con ese email."
            : "No se pudo crear el usuario en Supabase Auth.",
        },
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  // 2. Espejar el nuevo usuario en la tabla de la aplicación.
  const dbUser = await prisma.user.create({
    data: {
      id: created.user.id,
      email: data.email,
      name: data.name,
      image: data.image ?? null,
      role: data.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      enabled: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user: dbUser }, { status: 201 });
});
