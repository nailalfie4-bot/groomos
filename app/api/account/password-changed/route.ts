/**
 * POST /api/account/password-changed — send the "your password was changed"
 * security notice to the signed-in user's own email. Called right after a
 * successful change/reset. Reads the session server-side, so it can only ever
 * email the logged-in user themselves. Safe no-op if email isn't configured.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { passwordChangedEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }
  const whenLabel = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const msg = passwordChangedEmail({ whenLabel });
  const result = await sendEmail({ to: user.email, subject: msg.subject, html: msg.html });
  return NextResponse.json({ ok: result.ok, skipped: result.skipped ?? false });
}
