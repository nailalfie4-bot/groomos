/**
 * GET /api/founder/status — a safe self-diagnostic for the founder gate.
 *
 * Reveals no secrets: `founderEmailConfigured` is only whether the env var is
 * SET (not its value), and `sessionEmail` is the caller's own address. It exists
 * so the founder can see *why* /pipeline might 404 for them — is FOUNDER_EMAIL
 * being read at runtime? does the server see their session? do they match? — and
 * whether the internal-plan flag is granting access.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { founderEmail, getFounder } from "@/lib/auth/founder";
import { isInternalPlan } from "@/lib/trial";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  const env = founderEmail();

  let hasSession = false;
  let sessionEmail: string | null = null;
  let plan: string | null = null;

  if (configured) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      hasSession = true;
      sessionEmail = user.email ?? null;
      const { data: prof } = await supabase
        .from("users")
        .select("business_id")
        .eq("id", user.id)
        .maybeSingle();
      const bid = (prof as { business_id?: string } | null)?.business_id;
      if (bid) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("plan")
          .eq("id", bid)
          .maybeSingle();
        plan = (biz as { plan?: string | null } | null)?.plan ?? null;
      }
    }
  }

  const founder = await getFounder();
  return NextResponse.json({
    configured,
    founderEmailConfigured: !!env,
    hasSession,
    sessionEmail,
    matchesEnv: !!env && !!sessionEmail && sessionEmail.trim().toLowerCase() === env,
    internalPlan: isInternalPlan(plan),
    isFounder: !!founder,
    via: founder?.via ?? null,
  });
}
