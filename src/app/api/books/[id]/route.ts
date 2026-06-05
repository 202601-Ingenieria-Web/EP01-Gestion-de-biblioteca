// GET /api/books/[id] — detalle de un libro. Solo el ADMIN ve su inventario
// (disponibilidad actual); el USER recibe solo los datos de catálogo.
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async (_req, ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;

  const book = await prisma.book.findFirst({
    where: { id, deleted: false },
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      totalCopies: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          loans: { where: { returnedAt: null } },
        },
      },
    },
  });

  if (!book) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Libro no encontrado." } },
      { status: 404 }
    );
  }

  const { _count, totalCopies, ...rest } = book;
  // El USER no ve inventario: solo catálogo, sin totalCopies ni disponibilidad.
  const payload =
    me.role === "ADMIN"
      ? {
          ...rest,
          totalCopies,
          activeLoans: _count.loans,
          availableCopies: totalCopies - _count.loans,
        }
      : rest;

  return NextResponse.json({ book: payload }, { status: 200 });
});
