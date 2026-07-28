/**
 * GET /api/onboarding/verify?token=… — public, NON-CONSUMING.
 *
 * The /welcome page calls this on load to decide what to show. It only READS the
 * invite — nothing is spent — so a messaging-app link-preview crawler fetching
 * the invite URL can't invalidate it. (Crawlers don't run JS and won't call this
 * anyway; even if they did, it's a pure read.)
 *
 * Always 200 with a discriminated result so the page can be friendly:
 *   { valid: true,  businessName, email }         → show the set-password form
 *   { valid: false, reason: "claimed" }           → already set up, go log in
 *   { valid: false, reason: "expired" }           → ask for a fresh link
 *   { valid: false, reason: "not_found" }          → unknown/blank token
 */
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Reason = "claimed" | "expired" | "not_found";
const invalid = (reason: Reason) => NextResponse.json({ ok: true, valid: false, reason });

export async function GET(request: Request) {
  if (!isSupabaseConfigured() || !isAdminConfigured()) return invalid("not_found");

  const token = (new URL(request.url).searchParams.get("token") ?? "").trim();
  if (!token) return invalid("not_found");

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("onboarding_invites")
    .select("email, business_name, status, invited_user_id, expires_at")
    .eq("invite_token", token)
    .maybeSingle();
  const inv = data as
    | { email: string; business_name: string; status: string; invited_user_id: string | null; expires_at: string }
    | null;

  if (!inv || !inv.invited_user_id) return invalid("not_found");
  if (inv.status === "accepted") return invalid("claimed");
  if (new Date(inv.expires_at).getTime() <= Date.now()) return invalid("expired");

  return NextResponse.json({
    ok: true,
    valid: true,
    businessName: inv.business_name,
    email: inv.email,
  });
}
