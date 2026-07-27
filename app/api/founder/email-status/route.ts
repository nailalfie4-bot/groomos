/**
 * Founder-only email diagnostic.
 *
 *  GET  → is RESEND_API_KEY set at runtime, what REMINDERS_FROM resolves to, and
 *         whether it's the resend.dev default (which only delivers to your own
 *         Resend account email).
 *  POST { to? } → actually attempt a send and return exactly what Resend said
 *         (ok / skipped / the raw error), so you can see whether a real send
 *         works to a given address.
 *
 * Reveals no secret key — only whether it's set, and the (non-secret) from-address.
 */
import { NextResponse } from "next/server";
import { getFounder } from "@/lib/auth/founder";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_FROM = "GroomOS <onboarding@resend.dev>";

export async function GET() {
  const founder = await getFounder();
  if (!founder) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const from = process.env.REMINDERS_FROM || DEFAULT_FROM;
  return NextResponse.json({
    emailConfigured: isEmailConfigured(),
    resendKeySet: Boolean(process.env.RESEND_API_KEY),
    remindersFromSet: Boolean(process.env.REMINDERS_FROM),
    from,
    usingResendDefaultDomain: /@resend\.dev/i.test(from),
    note:
      "onboarding@resend.dev only delivers to your own Resend account email. To email customers, verify a domain in Resend and set REMINDERS_FROM to an address on it. POST { to } here to attempt a real send and see Resend's response.",
  });
}

export async function POST(request: Request) {
  const founder = await getFounder();
  if (!founder) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: { to?: string } = {};
  try {
    body = (await request.json()) as { to?: string };
  } catch {
    /* empty body → send to the founder's own email */
  }
  const to = (body.to || founder.email || "").trim();
  if (!to) return NextResponse.json({ ok: false, error: "no_recipient" }, { status: 400 });

  const result = await sendEmail({
    to,
    subject: "GroomOS email test",
    html: "<p>GroomOS deliverability test. If this reached your inbox, sending works for this address.</p>",
  });
  // result = { ok, skipped?, error? } — the exact Resend outcome.
  return NextResponse.json({ attemptedTo: to, ...result });
}
