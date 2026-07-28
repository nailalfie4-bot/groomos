/**
 * POST /api/onboarding/claim — public. Body: { token, password }.
 *
 * The ONLY step that consumes an invite: the customer has typed their own
 * password and pressed the button. We validate our durable token (unclaimed,
 * unexpired), set their password + confirm their email via the service-role
 * admin client, and mark the invite accepted. The browser then signs in with
 * the password it just chose, so the session is established the normal way.
 *
 * A GET never reaches here, so link-preview crawlers can't trigger a claim.
 */
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { checkPassword } from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured", message: "Onboarding isn't available here." },
      { status: 400 },
    );
  }

  let body: { token?: string; password?: string } = {};
  try {
    body = (await request.json()) as { token?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const token = (body.token ?? "").trim();
  const password = body.password ?? "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "invalid_link", message: "This invite link is invalid or has expired." },
      { status: 400 },
    );
  }
  if (!checkPassword(password).ok) {
    return NextResponse.json(
      { ok: false, error: "weak_password", message: "Please choose a stronger password." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("onboarding_invites")
    .select("id, email, status, invited_user_id, expires_at")
    .eq("invite_token", token)
    .maybeSingle();
  const inv = data as
    | { id: string; email: string; status: string; invited_user_id: string | null; expires_at: string }
    | null;

  if (!inv || !inv.invited_user_id) {
    return NextResponse.json(
      { ok: false, error: "invalid_link", message: "This invite link is invalid or has expired." },
      { status: 400 },
    );
  }
  if (inv.status === "accepted") {
    return NextResponse.json(
      { ok: false, error: "already_claimed", message: "This account is already set up — please log in." },
      { status: 409 },
    );
  }
  if (new Date(inv.expires_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "expired", message: "This invite has expired — please request a fresh link." },
      { status: 400 },
    );
  }

  // Preserve any existing metadata (e.g. business_name) while clearing the
  // must-change flag, then set the password and confirm the email so they can
  // sign in immediately.
  const { data: existing } = await admin.auth.admin.getUserById(inv.invited_user_id);
  const meta = { ...(existing?.user?.user_metadata ?? {}), must_change_password: false };
  const { error: updErr } = await admin.auth.admin.updateUserById(inv.invited_user_id, {
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (updErr) {
    console.error("onboarding claim: set-password failed", updErr);
    return NextResponse.json(
      { ok: false, error: "set_failed", message: "Couldn't set your password — please try again." },
      { status: 500 },
    );
  }

  // Mark accepted (idempotent — only flips a still-pending invite).
  await admin
    .from("onboarding_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", inv.id)
    .neq("status", "accepted");

  return NextResponse.json({ ok: true, email: inv.email });
}
