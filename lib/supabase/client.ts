/**
 * Supabase browser client for "use client" components.
 *
 * Cached as a single shared instance so we don't spin up multiple GoTrue
 * clients in one tab (which logs warnings and can desync auth state). Only ever
 * called client-side, and only when Supabase is configured.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return browserClient;
}
