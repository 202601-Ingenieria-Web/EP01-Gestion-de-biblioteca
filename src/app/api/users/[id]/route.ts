// PUT /api/users/[id] — cambia el rol de un usuario (solo ADMIN).
// Un ADMIN no puede quitarse su propio rol, así nunca queda el sistema sin
// administradores.
import { NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

const UpdateUserSchema = z.object({
  role: z.enum(["ADMIN", "USER"], {
    message: "El rol debe ser ADMIN o USER.",
  }),
});

export const PUT = apiHandler(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json().catch(() => ({}));
  const data = UpdateUserSchema.parse(body);

  if (admin.id === id && data.role !== "ADMIN") {
    return NextResponse.json(
      {
        error: {
          code: "SELF_DEMOTION",
          message: "No puedes quitarte tu propio rol de ADMIN.",
        },
      },
      { status: 409 }
    );
  }

  const target = await prisma.user.findFirst({
    where: { id, deleted: false },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Usuario no encontrado." } },
      { status: 404 }
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: data.role },
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

  return NextResponse.json({ user: updated }, { status: 200 });
});
