// GET /api/loans/[id] — detalle de un préstamo.
// El USER solo ve los suyos; si no, 404 (misma forma que un id inexistente,
// para no revelar que el préstamo existe pero es de otro).
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const GET = apiHandler(async (_req, ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;

  const loan = await prisma.loan.findFirst({
    where: {
      id,
      ...(me.role === "ADMIN" ? {} : { userId: me.id }),
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

  if (!loan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Préstamo no encontrado." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ loan }, { status: 200 });
});
