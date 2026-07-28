/**
 * POST /api/pipeline/onboard — founder-only. Two actions (by body.action):
 *
 *  create (default): create a groomer's account in advance and email them an
 *    invite link to claim it. Uses the service-role admin client: createUser()
 *    makes the auth user (the 0002 signup trigger then makes the business +
 *    settings + owner row from business_name), we configure that business (area,
 *    services, deposit, T&Cs), mint OUR OWN durable invite token, and email a
 *    branded /welcome?invite=… link via Resend. The founder never sets a password.
 *
 *  resend: re-email the invite for an existing, unclaimed invite. It REUSES the
 *    same token (regenerating never burns a link the customer already holds) and
 *    extends the window. The groomer still sets their own password on /welcome.
 *
 * Why our own token and not a Supabase magic link: magic-link tokens are
 * single-use and were consumed by the GET on /auth/callback — so a messaging
 * app's link-preview crawler fetching the URL spent the token before the human
 * clicked. Our token is only READ on /welcome (never consumed) and stays valid
 * until the password is actually set. See migration 0020 + /api/onboarding/*.
 */
import { NextResponse } from "next/server";
import { getFounder } from "@/lib/auth/founder";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { mintInviteToken, inviteUrlFor } from "@/lib/onboarding/invite-token";
import type { OnboardInput } from "@/lib/onboarding/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Our token isn't consumed by a fetch, so a generous window is safe and takes
// the time pressure off the customer.
const EXPIRY_DAYS = 30;

function expiryLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export async function POST(request: Request) {
  const founder = await getFounder();
  if (!founder) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 404 });

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "not_configured",
        message: "Onboarding needs Supabase (service role) — available in the live app only.",
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | ({ action?: string; inviteId?: string } & Partial<OnboardInput>)
    | null;
  if (!body) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const origin = new URL(request.url).origin;
  const admin = createSupabaseAdminClient();

  if (body.action === "resend") {
    return handleResend(admin, founder.id, body.inviteId ?? "", origin);
  }
  return handleCreate(admin, founder.id, body, origin);
}

async function handleCreate(
  admin: SupabaseClient,
  founderId: string,
  body: Partial<OnboardInput>,
  origin: string,
): Promise<NextResponse> {
  const businessName = (body.businessName ?? "").trim();
  const email = (body.ownerEmail ?? "").trim().toLowerCase();
  const area = (body.area ?? "").trim();
  const services = (body.services ?? []).filter((s) => s?.name?.trim());
  const depositAmount = Math.max(0, Number(body.depositAmount) || 0);
  const depositEnabled = Boolean(body.depositEnabled) && depositAmount > 0;
  const termsText = (body.termsText ?? "").trim();

  if (!businessName || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input", message: "A business name and a valid owner email are required." },
      { status: 400 },
    );
  }

  // 1) Create the invited user. The signup trigger creates the business +
  //    settings + owner row from business_name. Email stays unconfirmed until
  //    they claim the invite (we confirm it when they set their password).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { business_name: businessName, must_change_password: false },
  });
  if (createErr || !created?.user) {
    const msg = /already|exists|registered|duplicate/i.test(createErr?.message ?? "")
      ? "That email already has an account."
      : createErr?.message ?? "Couldn't create the invite.";
    return NextResponse.json({ ok: false, error: "invite_failed", message: msg }, { status: 400 });
  }
  const userId = created.user.id;

  // 2) Configure the business the trigger just created.
  const { data: profile } = await admin.from("users").select("business_id").eq("id", userId).maybeSingle();
  const businessId = (profile as { business_id?: string } | null)?.business_id ?? null;
  if (businessId) {
    if (area) await admin.from("businesses").update({ city: area }).eq("id", businessId);
    if (services.length) {
      await admin.from("services").insert(
        services.map((s) => ({
          business_id: businessId,
          name: s.name.trim(),
          description: "",
          duration_min: Math.max(5, Math.round(Number(s.durationMin) || 60)),
          price_gbp: Math.max(0, Number(s.priceGBP) || 0),
          active: true,
          is_addon: false,
        })),
      );
    }
    await admin
      .from("settings")
      .update({ deposit_enabled: depositEnabled, deposit_amount: depositAmount, terms_text: termsText || null })
      .eq("business_id", businessId);
  }

  // 3) Track the invite (owned by the founder), carrying our durable token.
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString();
  const inviteToken = mintInviteToken();
  const { data: inviteRow, error: invErr } = await admin
    .from("onboarding_invites")
    .insert({
      owner_id: founderId,
      email,
      business_name: businessName,
      business_id: businessId,
      invited_user_id: userId,
      invite_token: inviteToken,
      status: "sent",
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (invErr) {
    // Without the invite row we have no token to claim against — fail rather
    // than emailing a dead link. Roll back the just-created user so retrying the
    // same email works (this also surfaces a not-yet-run 0020 migration loudly).
    console.error("onboarding invite record insert failed:", invErr);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return NextResponse.json(
      { ok: false, error: "invite_failed", message: "Couldn't record the invite — please try again." },
      { status: 500 },
    );
  }

  // 4) Send the branded invite email (best-effort). The account + invite already
  //    exist above, so a send failure never loses the invite — we return the link
  //    and the exact Resend error so the founder can send it manually.
  const url = inviteUrlFor(origin, inviteToken);
  const msg = inviteEmail({ businessName, inviteUrl: url, expiresLabel: expiryLabel(expiresAt) });
  const emailed = await sendEmail({ to: email, subject: msg.subject, html: msg.html });
  if (!emailed.ok && !emailed.skipped) console.error("onboarding invite email failed:", emailed.error);

  return NextResponse.json({
    ok: true,
    id: (inviteRow as { id?: string } | null)?.id ?? null,
    email,
    url,
    emailed: emailed.ok,
    emailSkipped: emailed.skipped ?? false,
    emailError: emailed.ok ? null : emailed.error ?? null,
  });
}

async function handleResend(
  admin: SupabaseClient,
  founderId: string,
  inviteId: string,
  origin: string,
): Promise<NextResponse> {
  if (!inviteId) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  const { data: inv } = await admin
    .from("onboarding_invites")
    .select("id, email, business_name, status, invite_token")
    .eq("id", inviteId)
    .eq("owner_id", founderId)
    .maybeSingle();
  const invite = inv as
    | { id: string; email: string; business_name: string; status: string; invite_token: string | null }
    | null;
  if (!invite) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (invite.status === "accepted") {
    return NextResponse.json(
      { ok: false, error: "already_accepted", message: "This invite has already been claimed." },
      { status: 400 },
    );
  }

  // REUSE the same token so any link the customer already has keeps working —
  // regenerating must never burn a live invite. Only mint one for legacy invites
  // created before durable tokens existed.
  const inviteToken = invite.invite_token ?? mintInviteToken();
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString();
  const { error: updErr } = await admin
    .from("onboarding_invites")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      expires_at: expiresAt,
      invite_token: inviteToken,
    })
    .eq("id", inviteId);
  if (updErr) {
    return NextResponse.json(
      { ok: false, error: "invite_failed", message: "Couldn't refresh the invite — please try again." },
      { status: 500 },
    );
  }

  const url = inviteUrlFor(origin, inviteToken);
  const msg = inviteEmail({ businessName: invite.business_name, inviteUrl: url, expiresLabel: expiryLabel(expiresAt) });
  const emailed = await sendEmail({ to: invite.email, subject: msg.subject, html: msg.html });
  if (!emailed.ok && !emailed.skipped) console.error("onboarding invite resend email failed:", emailed.error);

  return NextResponse.json({
    ok: true,
    email: invite.email,
    url,
    emailed: emailed.ok,
    emailSkipped: emailed.skipped ?? false,
    emailError: emailed.ok ? null : emailed.error ?? null,
  });
}
