// GET /api/books/[id] — detalle de un libro con su disponibilidad actual.
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async (_req, ctx) => {
  await requireUser();
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

  const { _count, ...rest } = book;
  return NextResponse.json(
    {
      book: {
        ...rest,
        activeLoans: _count.loans,
        availableCopies: rest.totalCopies - _count.loans,
      },
    },
    { status: 200 }
  );
});
