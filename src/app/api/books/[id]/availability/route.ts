// GET /api/books/[id]/availability
//
// Serie diaria para la gráfica de evolución de las copias del libro. Por cada día:
//   totalCopies(día)     = suma de INCOMING − OUTGOING hasta ese día
//   activeLoans(día)     = préstamos abiertos hasta ese día
//   availableCopies(día) = totalCopies − activeLoans
//
// Se calcula en JavaScript a propósito: para los volúmenes de un proyecto de
// clase es más legible que una window function de Postgres.
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

/** Formatea una fecha como "YYYY-MM-DD" en UTC para que la serie sea estable. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const GET = apiHandler(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;

  const book = await prisma.book.findFirst({
    where: { id, deleted: false },
    select: { id: true, title: true, totalCopies: true, createdAt: true },
  });
  if (!book) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Libro no encontrado." } },
      { status: 404 }
    );
  }

  // Solo necesitamos fechas + dirección, para que el payload sea pequeño.
  const [movements, loans] = await Promise.all([
    prisma.movement.findMany({
      where: { bookId: id },
      orderBy: { createdAt: "asc" },
      select: { type: true, quantity: true, createdAt: true },
    }),
    prisma.loan.findMany({
      where: { bookId: id },
      orderBy: { loanedAt: "asc" },
      select: { loanedAt: true, returnedAt: true },
    }),
  ]);

  // Serie dispersa: solo días con algún evento (más amable para la gráfica).
  const days = new Set<string>();
  days.add(dayKey(book.createdAt));
  for (const m of movements) days.add(dayKey(m.createdAt));
  for (const l of loans) {
    days.add(dayKey(l.loanedAt));
    if (l.returnedAt) days.add(dayKey(l.returnedAt));
  }
  const sortedDays = Array.from(days).sort();

  // Recorremos día a día acumulando contadores y emitimos un punto por día.
  let runningTotalCopies = 0;
  let runningActiveLoans = 0;
  let movementCursor = 0;
  let loanCursor = 0;

  // Lista paralela de devoluciones para descontar préstamos en su fecha.
  const returnEvents = loans
    .map((l) => l.returnedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  let returnCursor = 0;

  const series = sortedDays.map((day) => {
    while (
      movementCursor < movements.length &&
      dayKey(movements[movementCursor].createdAt) <= day
    ) {
      const m = movements[movementCursor];
      runningTotalCopies += m.type === "INCOMING" ? m.quantity : -m.quantity;
      movementCursor += 1;
    }

    while (loanCursor < loans.length && dayKey(loans[loanCursor].loanedAt) <= day) {
      runningActiveLoans += 1;
      loanCursor += 1;
    }

    while (returnCursor < returnEvents.length && dayKey(returnEvents[returnCursor]) <= day) {
      runningActiveLoans -= 1;
      returnCursor += 1;
    }

    return {
      date: day,
      totalCopies: runningTotalCopies,
      activeLoans: runningActiveLoans,
      availableCopies: runningTotalCopies - runningActiveLoans,
    };
  });

  return NextResponse.json(
    {
      bookId: book.id,
      title: book.title,
      currentTotalCopies: book.totalCopies,
      series,
    },
    { status: 200 }
  );
});
