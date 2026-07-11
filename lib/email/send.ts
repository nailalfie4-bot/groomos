/**
 * Transactional email via Resend's REST API. SERVER-ONLY.
 *
 * Gated on RESEND_API_KEY: with no key set, every call is a safe no-op (returns
 * skipped:true) and nothing else breaks — so the app runs fine before email is
 * connected. The from-address comes from REMINDERS_FROM and must be on a domain
 * you've verified in Resend for real deliverability to clients; until then Resend
 * only delivers to your own account email.
 */
const DEFAULT_FROM = "GroomOS <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: "email_not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.REMINDERS_FROM || DEFAULT_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `resend_${res.status}:${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
