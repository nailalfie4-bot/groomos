/**
 * POST /api/account/login-ping — record a deliberate sign-in.
 *
 * Called by the client right after a successful password login / invite claim.
 * Reads the caller's own session, resolves their business, and appends a row to
 * login_events (via the admin client, since login_events is service-role-only).
 * Best-effort and side-effect-free for the user: it only powers the founder's
 * "total logins" / "first login" metrics. Never blocks or errors the login.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isSupabaseConfigured() || !isAdminConfigured()) return NextResponse.json({ ok: true });

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: true }); // not signed in → nothing to record

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();
    const businessId = (profile as { business_id?: string } | null)?.business_id ?? null;

    await admin.from("login_events").insert({ business_id: businessId, user_id: user.id });
  } catch (e) {
    // Never let a metrics write affect the login.
    console.error("login-ping failed:", e);
  }
  return NextResponse.json({ ok: true });
}
