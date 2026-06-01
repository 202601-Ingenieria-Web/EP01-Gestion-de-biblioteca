// GET  /api/movements?bookId=… — lista los movimientos de un libro
// POST /api/movements            — registra un movimiento INCOMING u OUTGOING
//
// Según la consigna, AMBOS roles (USER y ADMIN) pueden crear movimientos; queda
// registrado como responsable el usuario en sesión. El POST va en una
// transacción para que el Movement y el nuevo `Book.totalCopies` se confirmen
// juntos.
import { NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async (req) => {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json(
      { error: { code: "MISSING_PARAM", message: "Falta el parámetro bookId." } },
      { status: 400 }
    );
  }

  const movements = await prisma.movement.findMany({
    where: { bookId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      quantity: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ movements }, { status: 200 });
});

const CreateMovementSchema = z.object({
  bookId: z.string().min(1, "bookId es requerido."),
  type: z.enum(["INCOMING", "OUTGOING"], {
    message: "El tipo de movimiento debe ser INCOMING (ingreso) u OUTGOING (salida).",
  }),
  // Siempre positiva; el signo lo da `type`.
  quantity: z
    .number({ message: "La cantidad debe ser un número." })
    .int("La cantidad debe ser un entero.")
    .positive("La cantidad debe ser mayor que cero."),
});

export const POST = apiHandler(async (req) => {
  const me = await requireUser();

  const body = await req.json().catch(() => ({}));
  const data = CreateMovementSchema.parse(body);

  const book = await prisma.book.findFirst({
    where: { id: data.bookId, deleted: false },
    select: {
      id: true,
      totalCopies: true,
      _count: { select: { loans: { where: { returnedAt: null } } } },
    },
  });
  if (!book) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Libro no encontrado." } },
      { status: 404 }
    );
  }

  const delta = data.type === "INCOMING" ? data.quantity : -data.quantity;
  const newTotal = book.totalCopies + delta;

  // Reglas para OUTGOING: las copias no pueden quedar negativas ni por debajo de
  // los préstamos activos (no se dan de baja copias que alguien tiene prestadas).
  if (newTotal < 0) {
    return NextResponse.json(
      {
        error: {
          code: "INSUFFICIENT_STOCK",
          message: `No hay suficientes copias. Disponibles en inventario: ${book.totalCopies}.`,
        },
      },
      { status: 409 }
    );
  }
  if (newTotal < book._count.loans) {
    return NextResponse.json(
      {
        error: {
          code: "LOANED_COPIES",
          message: `No puedes dar de baja copias que están actualmente prestadas. Préstamos activos: ${book._count.loans}.`,
        },
      },
      { status: 409 }
    );
  }

  const [movement] = await prisma.$transaction([
    prisma.movement.create({
      data: {
        bookId: data.bookId,
        userId: me.id,
        type: data.type,
        quantity: data.quantity,
      },
      select: {
        id: true,
        type: true,
        quantity: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.book.update({
      where: { id: data.bookId },
      data: { totalCopies: { increment: delta } },
    }),
  ]);

  return NextResponse.json({ movement }, { status: 201 });
});
