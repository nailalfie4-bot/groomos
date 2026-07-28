/**
 * POST /api/invite/refresh — public, self-service "send me a fresh invite link".
 *
 * If the email has a pending (unclaimed) onboarding invite, REUSE its durable
 * token (extending the window) and re-email the /welcome?invite=… link. Reusing
 * the token means the customer's existing link keeps working too — nothing is
 * burnt. The founder is also notified — WITH the link if the email to the
 * customer failed — so a fresh link always reaches someone who can forward it.
 * Always responds the same way (no account enumeration).
 */
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { mintInviteToken, inviteUrlFor } from "@/lib/onboarding/invite-token";
import { founderEmail } from "@/lib/auth/founder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isAdminConfigured()) return NextResponse.json({ ok: true });

  let body: { email?: string } = {};
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    /* empty */
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: true });

  const admin = createSupabaseAdminClient();
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  try {
    const { data: inv } = await admin
      .from("onboarding_invites")
      .select("id, business_name, status, invite_token")
      .ilike("email", email)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const invite = inv as
      | { id: string; business_name: string; status: string; invite_token: string | null }
      | null;

    if (invite && invite.status !== "accepted") {
      // Reuse the existing durable token (mint only for legacy invites).
      const inviteToken = invite.invite_token ?? mintInviteToken();
      const url = inviteUrlFor(origin, inviteToken);
      const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
      await admin
        .from("onboarding_invites")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          expires_at: expiresAt,
          invite_token: inviteToken,
        })
        .eq("id", invite.id);

      const msg = inviteEmail({
        businessName: invite.business_name,
        inviteUrl: url,
        expiresLabel: new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" }),
      });
      const emailed = await sendEmail({ to: email, subject: msg.subject, html: msg.html });

      const founder = founderEmail();
      if (founder) {
        await sendEmail({
          to: founder,
          subject: `Invite link re-requested: ${email}`,
          html: emailed.ok
            ? `<p>${email} requested a fresh invite link — it was emailed to them.</p>`
            : `<p>${email} requested a fresh invite link, but emailing them failed (${emailed.error ?? "unknown"}). Send them this link:</p><p><a href="${url}">${url}</a></p>`,
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error("invite refresh failed:", e);
  }

  return NextResponse.json({ ok: true });
}
