/**
 * POST /api/invite/refresh — public, self-service "send me a fresh invite link".
 *
 * If the email has a pending (unclaimed) onboarding invite, mint a new magic link
 * and email it to that address. The founder is also notified — WITH the link if
 * the email to the customer failed — so a fresh link always reaches someone who
 * can forward it. Always responds the same way (no account enumeration).
 */
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
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
      .select("id, business_name, status")
      .ilike("email", email)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const invite = inv as { id: string; business_name: string; status: string } | null;

    if (invite && invite.status !== "accepted") {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${origin}/auth/callback?next=/welcome` },
      });
      const tokenHash = linkData?.properties?.hashed_token;
      if (tokenHash) {
        const url = `${origin}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=/welcome`;
        const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
        await admin
          .from("onboarding_invites")
          .update({ status: "sent", sent_at: new Date().toISOString(), expires_at: expiresAt })
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
              : `<p>${email} requested a fresh invite link, but emailing them failed (${emailed.error ?? "unknown"}). Send them this single-use link:</p><p><a href="${url}">${url}</a></p>`,
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error("invite refresh failed:", e);
  }

  return NextResponse.json({ ok: true });
}
