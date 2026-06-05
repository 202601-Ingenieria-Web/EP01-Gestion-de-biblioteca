// GET  /api/books  — lista libros (USER + ADMIN)
// POST /api/books  — crea un libro (solo ADMIN)
//
// Para ADMIN cada fila expone los datos de inventario (`totalCopies`,
// `activeLoans` y `availableCopies` = totalCopies − préstamos activos). Los
// USER no pueden ver el inventario: reciben solo los datos de catálogo.
import { NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async () => {
  const me = await requireUser();

  // Libros + creador + conteo de préstamos activos en una sola consulta.
  const books = await prisma.book.findMany({
    where: { deleted: false },
    orderBy: { createdAt: "desc" },
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

  // ADMIN ve el inventario (aplanamos `_count.loans` a `activeLoans` y derivamos
  // `availableCopies`). El USER recibe solo el catálogo, sin datos de stock.
  const isAdmin = me.role === "ADMIN";
  const data = books.map(({ _count, totalCopies, ...book }) =>
    isAdmin
      ? {
          ...book,
          totalCopies,
          activeLoans: _count.loans,
          availableCopies: totalCopies - _count.loans,
        }
      : book
  );

  return NextResponse.json({ books: data }, { status: 200 });
});

const CreateBookSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio.").max(200),
  author: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  totalCopies: z
    .number({ message: "El total de copias debe ser un número." })
    .int("El total de copias debe ser un entero.")
    .min(0, "El total de copias no puede ser negativo."),
});

export const POST = apiHandler(async (req) => {
  // Solo ADMIN puede crear libros; queda registrado como creador.
  const admin = await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const data = CreateBookSchema.parse(body);

  const created = await prisma.book.create({
    data: {
      title: data.title,
      author: data.author ?? null,
      description: data.description ?? null,
      totalCopies: data.totalCopies,
      createdById: admin.id,
    },
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      totalCopies: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Un libro nuevo no tiene préstamos, así que availability == totalCopies.
  return NextResponse.json(
    {
      book: {
        ...created,
        activeLoans: 0,
        availableCopies: created.totalCopies,
      },
    },
    { status: 201 }
  );
});
