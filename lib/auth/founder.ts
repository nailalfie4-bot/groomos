/**
 * Founder gate (server-side). The founder is whoever's email matches the
 * FOUNDER_EMAIL env var. Used by /pipeline and its API routes. The email is
 * never hardcoded — only read from the environment.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function founderEmail(): string | null {
  return process.env.FOUNDER_EMAIL?.trim().toLowerCase() || null;
}

export interface Founder {
  id: string;
  email: string;
}

/**
 * Resolve the current founder, or null if the caller isn't the founder.
 * In demo mode (no Supabase) returns a local sentinel so the pages can be
 * developed without a login — never the case in production.
 */
export async function getFounder(): Promise<Founder | null> {
  if (!isSupabaseConfigured()) return { id: "demo-founder", email: "demo@local" };
  const founder = founderEmail();
  if (!founder) return null;
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email || email !== founder) return null;
  return { id: user.id, email };
}
