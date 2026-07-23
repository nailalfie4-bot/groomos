/**
 * Auth callback — the single landing point for email auth links.
 *
 * Handles two mechanisms and sets the session cookie for both:
 *  - PKCE `code`  → password reset (user-initiated resetPasswordForEmail).
 *  - `token_hash` + `type` → the founder invite (admin-generated link we email
 *    via Resend), verified with verifyOtp so no browser-side code verifier is
 *    needed.
 * Then it redirects to a safe same-origin `next` path.
 */
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));

  const supabase = createSupabaseServerClient();
  let failed = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failed = Boolean(error);
  } else {
    failed = true;
  }

  if (failed) {
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("authError", "link_invalid");
    return NextResponse.redirect(dest);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
