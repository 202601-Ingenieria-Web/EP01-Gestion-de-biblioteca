// Cliente de Supabase para el lado servidor (Route Handlers, Server Components,
// Server Actions). Usa la *anon key*: solo hace lo que el usuario logueado
// puede hacer. La service-role key vive aparte en supabase/admin.ts.
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function readEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env. See .env.example."
    );
  }
  return { url, anonKey };
}

export async function createSupabaseServerClient() {
  const { url, anonKey } = readEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Desde un Server Component no se pueden setear cookies; el proxy
          // las refresca en la siguiente navegación.
        }
      },
    },
  });
}
