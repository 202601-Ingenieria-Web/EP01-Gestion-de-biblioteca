// PUT /api/loans/[id]/return — Body: { returnCondition: "GOOD"|"DAMAGED", notes? }
//
// Marca un préstamo como devuelto. El USER solo devuelve los suyos; el ADMIN
// puede devolver el de cualquiera. Si ya estaba devuelto responde 409.
import { NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

const ReturnLoanSchema = z.object({
  returnCondition: z.enum(["GOOD", "DAMAGED"], {
    message: "El estado debe ser GOOD (buen estado) o DAMAGED (con defectos).",
  }),
  notes: z.string().max(500).optional().nullable(),
});

export const PUT = apiHandler(async (req, ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const data = ReturnLoanSchema.parse(body);

  const loan = await prisma.loan.findFirst({
    where: {
      id,
      ...(me.role === "ADMIN" ? {} : { userId: me.id }),
    },
    select: { id: true, returnedAt: true, notes: true },
  });

  if (!loan) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Préstamo no encontrado." } },
      { status: 404 }
    );
  }

  if (loan.returnedAt) {
    return NextResponse.json(
      {
        error: {
          code: "ALREADY_RETURNED",
          message: "Este préstamo ya fue marcado como devuelto.",
        },
      },
      { status: 409 }
    );
  }

  const updated = await prisma.loan.update({
    where: { id },
    data: {
      returnedAt: new Date(),
      returnCondition: data.returnCondition,
      // Anexa las notas de devolución si se enviaron.
      notes:
        data.notes != null
          ? loan.notes
            ? `${loan.notes}\n[return] ${data.notes}`
            : data.notes
          : loan.notes,
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

  return NextResponse.json({ loan: updated }, { status: 200 });
});
