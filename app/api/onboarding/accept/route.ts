/**
 * POST /api/onboarding/accept — called by /welcome once the invited groomer has
 * set their own password. Marks their invite accepted so the founder can see it
 * on /pipeline/onboard. Reads the caller's own session, then updates via the
 * admin client (the invite row is owned by the founder, so RLS would block the
 * groomer's own client from updating it).
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: true });
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  if (!isAdminConfigured()) return NextResponse.json({ ok: true });

  const admin = createSupabaseAdminClient();
  await admin
    .from("onboarding_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("invited_user_id", user.id)
    .neq("status", "accepted");

  return NextResponse.json({ ok: true });
}
