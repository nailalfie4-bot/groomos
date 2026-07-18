/**
 * POST /api/pay/intent — start the deposit payment for a deposit link.
 *
 * Creates a PaymentIntent on the groomer's CONNECTED account (direct charge)
 * for the appointment's deposit and returns the client secret for the card
 * element. The amount comes from the stored link — never trusted from the body.
 *
 * Body: { token }.
 */
import { NextResponse } from "next/server";
import { resolveDepositLinkPublic } from "@/lib/data/deposit-links";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { getStripe, isStripeServerConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured() || !isStripeServerConfigured()) {
    return NextResponse.json({ ok: false, error: "not_available" }, { status: 404 });
  }

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const token = String(body.token ?? "");

  const link = await resolveDepositLinkPublic(token).catch(() => null);
  if (!link || !link.found) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (link.paid) {
    return NextResponse.json({ ok: false, error: "already_paid" }, { status: 409 });
  }
  if (link.expired) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  }
  if (!link.chargeReady || !link.connectedAccountId) {
    return NextResponse.json({ ok: false, error: "not_chargeable" }, { status: 400 });
  }
  const amountPence = Math.round(link.amount * 100);
  if (amountPence <= 0) {
    return NextResponse.json({ ok: false, error: "not_chargeable" }, { status: 400 });
  }

  try {
    const intent = await getStripe().paymentIntents.create(
      {
        amount: amountPence,
        currency: "gbp",
        // Card + wallets only (no redirect methods) so it's a single inline step.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        description: `Deposit — ${link.serviceName} at ${link.businessName}`,
        metadata: { token, kind: "deposit_link" },
      },
      { stripeAccount: link.connectedAccountId },
    );
    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      amount: link.amount,
      publishableKey: link.publishableKey,
      connectedAccountId: link.connectedAccountId,
    });
  } catch (err) {
    console.error("deposit link PaymentIntent create failed:", err);
    return NextResponse.json({ ok: false, error: "stripe_error" }, { status: 502 });
  }
}
