// Capa de acceso a datos (DAL) de autenticación y autorización.
//
// El id de auth.users (Supabase) es el mismo UUID que public.User.id. Usamos
// getUser() (valida el token contra Supabase) en vez de getSession() (que
// confiaría en la cookie sin validar), según la guía oficial de Supabase SSR.
import "server-only";

import { cache } from "react";

import prisma from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Usuario autenticado con los campos seguros para exponer a la UI. */
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  image: string | null;
};

// Envuelto en cache() de React: una misma request que toca varios handlers
// hace la consulta a la BD una sola vez.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      image: true,
      enabled: true,
      deleted: true,
    },
  });

  if (!dbUser || dbUser.deleted || !dbUser.enabled) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    image: dbUser.image,
  };
});

/** Exige sesión activa; si no, lanza 401 (vía apiHandler). */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

/** Como requireUser pero además exige rol ADMIN; si no, lanza 403. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN");
  return user;
}

/** Errores de la DAL que apiHandler traduce a respuestas HTTP. */
export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}
