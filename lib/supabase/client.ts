/**
 * Supabase browser client — Stage 1 foundation.
 *
 * NOTE: nothing in the app imports this yet. The working demo still runs
 * entirely on the in-memory mock store (lib/mock/store.tsx). This helper just
 * sits here ready for Stage 2, which will start reading/writing real data
 * behind a feature flag so the demo keeps working throughout the migration.
 */
import { createBrowserClient } from "@supabase/ssr";

/** A Supabase client for use in browser ("use client") components. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
