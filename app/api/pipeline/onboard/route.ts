/**
 * POST /api/pipeline/onboard — founder-only. Two actions (by body.action):
 *
 *  create (default): create a groomer's account in advance and email them a
 *    single-use invite link to claim it. Uses the service-role admin client:
 *    generateLink({type:'invite'}) creates the auth user (the 0002 signup
 *    trigger then makes the business + settings + owner row from business_name),
 *    then we configure that business (area, services, deposit, T&Cs) and email a
 *    branded invite via Resend. The founder never sets or sees a password.
 *
 *  resend: reissue a fresh single-use link (7-day window) for an existing,
 *    unclaimed invite via a magic link — the groomer still sets their own
 *    password on /welcome.
 */
import { NextResponse } from "next/server";
import { getFounder } from "@/lib/auth/founder";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import type { OnboardInput } from "@/lib/onboarding/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EXPIRY_DAYS = 7;

function buildInviteUrl(origin: string, tokenHash: string, type: string): string {
  const u = new URL("/auth/callback", origin);
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", type);
  u.searchParams.set("next", "/welcome");
  return u.toString();
}

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

  // 1) Create the invited user + get the single-use invite token. The signup
  //    trigger creates the business + settings + owner row from business_name.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { business_name: businessName, must_change_password: false },
      redirectTo: `${origin}/auth/callback?next=/welcome`,
    },
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !linkData?.user || !tokenHash) {
    const msg = /already|exists|registered/i.test(linkErr?.message ?? "")
      ? "That email already has an account."
      : linkErr?.message ?? "Couldn't create the invite.";
    return NextResponse.json({ ok: false, error: "invite_failed", message: msg }, { status: 400 });
  }
  const userId = linkData.user.id;

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

  // 3) Track the invite (owned by the founder).
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString();
  const { data: inviteRow, error: invErr } = await admin
    .from("onboarding_invites")
    .insert({
      owner_id: founderId,
      email,
      business_name: businessName,
      business_id: businessId,
      invited_user_id: userId,
      status: "sent",
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (invErr) console.error("onboarding invite record insert failed:", invErr);

  // 4) Send the branded invite email.
  const url = buildInviteUrl(origin, tokenHash, "invite");
  const msg = inviteEmail({ businessName, inviteUrl: url, expiresLabel: expiryLabel(expiresAt) });
  const emailed = await sendEmail({ to: email, subject: msg.subject, html: msg.html });

  return NextResponse.json({
    ok: true,
    id: (inviteRow as { id?: string } | null)?.id ?? null,
    emailed: emailed.ok,
    emailSkipped: emailed.skipped ?? false,
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
    .select("id, email, business_name, status")
    .eq("id", inviteId)
    .eq("owner_id", founderId)
    .maybeSingle();
  const invite = inv as { id: string; email: string; business_name: string; status: string } | null;
  if (!invite) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (invite.status === "accepted") {
    return NextResponse.json(
      { ok: false, error: "already_accepted", message: "This invite has already been claimed." },
      { status: 400 },
    );
  }

  // The user already exists, so use a magic link (invite would error). They
  // still land on /welcome and set their own password.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: invite.email,
    options: { redirectTo: `${origin}/auth/callback?next=/welcome` },
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    return NextResponse.json(
      { ok: false, error: "invite_failed", message: linkErr?.message ?? "Couldn't regenerate the link." },
      { status: 400 },
    );
  }

  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000).toISOString();
  await admin
    .from("onboarding_invites")
    .update({ status: "sent", sent_at: new Date().toISOString(), expires_at: expiresAt })
    .eq("id", inviteId);

  const url = buildInviteUrl(origin, tokenHash, "magiclink");
  const msg = inviteEmail({ businessName: invite.business_name, inviteUrl: url, expiresLabel: expiryLabel(expiresAt) });
  const emailed = await sendEmail({ to: invite.email, subject: msg.subject, html: msg.html });

  return NextResponse.json({ ok: true, emailed: emailed.ok, emailSkipped: emailed.skipped ?? false });
}
