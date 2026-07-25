/**
 * GET /api/stripe/status — founder-only Stripe price/config diagnostic.
 *
 * Answers "why won't Starter open checkout?" without exposing any secret. It
 * reports, per plan, whether that plan's STRIPE_PRICE_* env var is being read at
 * runtime, whether it looks like a real price id, and a masked preview — plus
 * whether the secret key is present at all. No full price ids, no keys.
 *
 * Founder-gated (same gate as /pipeline): a non-founder gets a plain 404, so the
 * endpoint doesn't even reveal it exists.
 */
import { NextResponse } from "next/server";
import { getFounder } from "@/lib/auth/founder";
import { isStripeServerConfigured, priceConfigStatus } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const founder = await getFounder();
  if (!founder) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const prices = priceConfigStatus();
  return NextResponse.json({
    stripeConfigured: isStripeServerConfigured(),
    prices,
    allPlansConfigured: prices.every((p) => p.set && p.valid),
  });
}
