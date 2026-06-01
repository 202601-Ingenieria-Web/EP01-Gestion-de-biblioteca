// Préstamos (funcionalidad extra de la temática de biblioteca).
// GET  /api/loans  — USER ve solo los suyos; ADMIN ve todos y puede filtrar
//                    por ?userId=, ?bookId= y ?status=active|returned.
// POST /api/loans  — crea un préstamo (USER solo a su nombre; ADMIN a cualquiera).
//
// Un préstamo NO cambia `Book.totalCopies`; solo reduce `availableCopies`.
import { NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async (req) => {
  const me = await requireUser();
  const { searchParams } = new URL(req.url);

  // El USER nunca ve préstamos ajenos; el ADMIN puede filtrar libremente.
  const userIdFilter =
    me.role === "ADMIN" ? searchParams.get("userId") ?? undefined : me.id;
  const bookIdFilter = searchParams.get("bookId") ?? undefined;
  const statusFilter = searchParams.get("status");

  const where: {
    userId?: string;
    bookId?: string;
    returnedAt?: null | { not: null };
  } = {};
  if (userIdFilter) where.userId = userIdFilter;
  if (bookIdFilter) where.bookId = bookIdFilter;
  if (statusFilter === "active") where.returnedAt = null;
  if (statusFilter === "returned") where.returnedAt = { not: null };

  const loans = await prisma.loan.findMany({
    where,
    orderBy: { loanedAt: "desc" },
    select: {
      id: true,
      loanedAt: true,
      returnedAt: true,
      returnCondition: true,
      notes: true,
      book: { select: { id: true, title: true, author: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ loans }, { status: 200 });
});

const CreateLoanSchema = z.object({
  bookId: z.string().min(1, "bookId es requerido."),
  // Opcional; por defecto el usuario en sesión. Solo el ADMIN puede prestar
  // a nombre de otro.
  userId: z.string().min(1).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const POST = apiHandler(async (req) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const data = CreateLoanSchema.parse(body);

  // A quién se le presta. El USER solo puede prestarse a sí mismo.
  const borrowerId = data.userId ?? me.id;
  if (me.role !== "ADMIN" && borrowerId !== me.id) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Sólo puedes crear préstamos a tu propio nombre.",
        },
      },
      { status: 403 }
    );
  }

  // Validación + creación en una transacción para evitar carreras al chequear
  // la disponibilidad.
  const result = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findFirst({
      where: { id: data.bookId, deleted: false },
      select: { id: true, totalCopies: true },
    });
    if (!book) return { kind: "NOT_FOUND" as const, target: "book" };

    const borrower = await tx.user.findFirst({
      where: { id: borrowerId, deleted: false, enabled: true },
      select: { id: true },
    });
    if (!borrower) return { kind: "NOT_FOUND" as const, target: "user" };

    const activeLoans = await tx.loan.count({
      where: { bookId: data.bookId, returnedAt: null },
    });
    if (activeLoans >= book.totalCopies) {
      return { kind: "NO_AVAILABILITY" as const, totalCopies: book.totalCopies };
    }

    // Evitamos que el mismo usuario tenga dos préstamos activos del mismo libro.
    const existing = await tx.loan.findFirst({
      where: { bookId: data.bookId, userId: borrowerId, returnedAt: null },
      select: { id: true },
    });
    if (existing) return { kind: "ALREADY_LOANED" as const };

    const loan = await tx.loan.create({
      data: {
        bookId: data.bookId,
        userId: borrowerId,
        notes: data.notes ?? null,
      },
      select: {
        id: true,
        loanedAt: true,
        returnedAt: true,
        returnCondition: true,
        notes: true,
        book: { select: { id: true, title: true, author: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return { kind: "OK" as const, loan };
  });

  switch (result.kind) {
    case "NOT_FOUND":
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message:
              result.target === "book"
                ? "Libro no encontrado."
                : "Usuario no encontrado o deshabilitado.",
          },
        },
        { status: 404 }
      );
    case "NO_AVAILABILITY":
      return NextResponse.json(
        {
          error: {
            code: "NO_AVAILABILITY",
            message: `No hay copias disponibles. Todas las ${result.totalCopies} copias están prestadas.`,
          },
        },
        { status: 409 }
      );
    case "ALREADY_LOANED":
      return NextResponse.json(
        {
          error: {
            code: "ALREADY_LOANED",
            message: "Este usuario ya tiene un préstamo activo de este libro.",
          },
        },
        { status: 409 }
      );
    case "OK":
      return NextResponse.json({ loan: result.loan }, { status: 201 });
  }
});
