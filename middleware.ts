// Proxy de Next.js 16 (antes Middleware). Refresca el token de Supabase en
// cada navegación (vence cada hora) y hace redirecciones de auth optimistas.
// La verificación estricta de ADMIN para /users NO se hace aquí, sino en el
// route handler con requireAdmin(): mantiene el proxy rápido (sin consultas a
// la BD) y deja la autorización real junto a los datos.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/login"];
const PROTECTED_PREFIXES = ["/books", "/loans", "/inventory", "/users"];

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  let res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin env configurado dejamos pasar para que el error sea visible en la página.
  if (!supabaseUrl || !supabaseAnonKey) return res;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Espejamos las cookies en `req` (para el código posterior) y en `res`
        // (para el navegador), según la guía oficial de Supabase + Next.js SSR.
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: { headers: req.headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() valida el JWT contra Supabase, lo refresca si va a vencer y
  // reescribe las cookies vía setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  if (isAuthed && PUBLIC_PATHS.includes(path)) {
    return NextResponse.redirect(new URL("/books", req.url));
  }

  // Forwardeamos la ruta intentada en ?next= para volver tras el login.
  if (!isAuthed && startsWithAny(path, PROTECTED_PREFIXES)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

// Solo corre en rutas de página; las rutas /api validan su propia auth.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
