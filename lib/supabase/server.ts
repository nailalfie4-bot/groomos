/**
 * Supabase server client — for Server Components, Server Actions and Route
 * Handlers. Reads/writes the auth session from cookies so SSR knows who is
 * logged in. (Browser code uses lib/supabase/client.ts instead.)
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore — the middleware refreshes the session cookie.
          }
        },
      },
    },
  );
}
