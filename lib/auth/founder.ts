/**
 * Founder gate (server-side). Used by /pipeline, /pipeline/onboard and their API
 * routes. The founder email is never hardcoded — only read from the environment.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isInternalPlan } from "@/lib/trial";

export function founderEmail(): string | null {
  return process.env.FOUNDER_EMAIL?.trim().toLowerCase() || null;
}

export interface Founder {
  id: string;
  email: string;
  /** How they were recognised — surfaced by the diagnostic endpoint. */
  via: "email" | "internal-plan";
}

/**
 * Resolve the current founder, or null if the caller isn't the founder.
 *
 * Two founder-controlled identifiers, either of which grants access:
 *  1. their signed-in email matches the FOUNDER_EMAIL env var, or
 *  2. their business carries the internal/owner plan — a flag that is only ever
 *     settable directly in the database (no UI, not a Stripe plan), so no
 *     customer can grant it to themselves. This is the robust fallback if the
 *     env var isn't being read at runtime.
 *
 * In demo mode (no Supabase) returns a local sentinel so the pages can be
 * developed without a login — never the case in production.
 */
export async function getFounder(): Promise<Founder | null> {
  if (!isSupabaseConfigured()) return { id: "demo-founder", email: "demo@local", via: "email" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const email = user.email?.trim().toLowerCase() ?? "";
  const founder = founderEmail();
  if (founder && email === founder) return { id: user.id, email, via: "email" };

  // DB fallback: an internal/owner-plan account is a founder-flagged account.
  const { data: prof } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  const businessId = (prof as { business_id?: string } | null)?.business_id;
  if (businessId) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("plan")
      .eq("id", businessId)
      .maybeSingle();
    if (isInternalPlan((biz as { plan?: string | null } | null)?.plan)) {
      return { id: user.id, email, via: "internal-plan" };
    }
  }
  return null;
}
