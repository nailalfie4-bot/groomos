/**
 * Supabase admin (service-role) client — SERVER-ONLY.
 *
 * Bypasses Row Level Security, so it must never be imported into client code.
 * It is safe here because it reads SUPABASE_SERVICE_ROLE_KEY, which is not a
 * NEXT_PUBLIC_* var and therefore is never bundled for the browser — if this
 * module were ever imported client-side the key would be undefined and the
 * factory would throw.
 *
 * Used only by the public booking route handlers / server component, which
 * resolve a business by slug and create bookings on behalf of anonymous
 * visitors (no anon RLS is opened).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | undefined;

export function createSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY missing).",
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next.js patches global fetch and caches it by default. These queries must
    // always hit the database (fresh availability, live clash checks), so every
    // request from this client opts out of the cache.
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return adminClient;
}

/** Whether the service-role client can be built (real keys present). */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR-PROJECT-REF"),
  );
}
