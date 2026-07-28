/**
 * Auth callback — landing point for Supabase email auth links.
 *
 * Handles two mechanisms and sets the session cookie for both:
 *  - PKCE `code`  → password reset (user-initiated resetPasswordForEmail).
 *  - `token_hash` + `type` → verified with verifyOtp (no browser-side code
 *    verifier needed). NOTE: this consumes the single-use token on GET, so it's
 *    no longer used for onboarding invites — those now use our own durable token
 *    (/welcome?invite=…, see /api/onboarding/*) that a link-preview crawler
 *    can't consume. This branch remains only for password reset and any legacy
 *    invite links already in the wild.
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
    // An expired/used onboarding invite (invite or magic link, or one headed to
    // /welcome) gets a friendly self-service page instead of a login error.
    if (type === "invite" || type === "magiclink" || next === "/welcome") {
      return NextResponse.redirect(new URL("/invite-expired", url.origin));
    }
    const dest = new URL("/login", url.origin);
    dest.searchParams.set("authError", "link_invalid");
    return NextResponse.redirect(dest);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
