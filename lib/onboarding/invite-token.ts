/**
 * Durable invite tokens — SERVER-ONLY.
 *
 * Our own invite credential, replacing Supabase magic-link tokens for the
 * founder-assisted onboarding flow. Unlike a magic link, this token is:
 *   • never consumed by a GET (link-preview crawlers can fetch the URL freely),
 *   • valid until the customer actually sets their password, and
 *   • reused across re-sends, so regenerating an invite never burns the link a
 *     customer already holds.
 *
 * It's a 256-bit URL-safe random string, stored on the onboarding_invites row
 * and only ever read by the service-role server (RLS hides it from everyone
 * else) — the same shape as the deposit-link token.
 */
import { randomBytes } from "crypto";

/** Mint a fresh, unguessable, URL-safe invite token. */
export function mintInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Build the customer-facing invite URL for a token (lands on /welcome). */
export function inviteUrlFor(origin: string, token: string): string {
  const u = new URL("/welcome", origin);
  u.searchParams.set("invite", token);
  return u.toString();
}
