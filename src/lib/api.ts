// Wrapper común para todos los route handlers. Convierte los errores lanzados
// en respuestas JSON con forma estable { error: { code, message, details? } }
// y evita filtrar trazas de Prisma al cliente.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

export type ApiHandler = (
  req: Request,
  context: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export function apiHandler(handler: ApiHandler): ApiHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (err) {
      if (err instanceof AuthError) {
        const status = err.code === "UNAUTHENTICATED" ? 401 : 403;
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message:
                err.code === "UNAUTHENTICATED"
                  ? "Debes iniciar sesión para acceder a este recurso."
                  : "No tienes permisos para realizar esta acción.",
            },
          },
          { status }
        );
      }

      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Datos inválidos.",
              details: err.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }

      // Cualquier otro caso: log en servidor y 500 genérico. Nunca devolvemos
      // el mensaje crudo (puede contener nombres de columnas, SQL, etc.).
      console.error("[api] unhandled error", err);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Ocurrió un error inesperado.",
          },
        },
        { status: 500 }
      );
    }
  };
}
