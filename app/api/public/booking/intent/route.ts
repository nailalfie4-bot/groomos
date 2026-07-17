/**
 * POST /api/public/booking/intent — start a deposit payment for a booking.
 *
 * Creates a PaymentIntent on the groomer's CONNECTED account (a direct charge,
 * so the deposit lands in the groomer's balance) and returns its client secret
 * for the card element. The booking itself is only created once this payment
 * has succeeded, via POST /api/public/booking with the PaymentIntent id.
 *
 * Body: { slug, serviceId }. The amount is computed server-side from the
 * business's settings — never trusted from the client.
 */
import { NextResponse } from "next/server";
import { resolveBookingPage } from "@/lib/data/public-booking";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { getStripe, isStripeServerConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured() || !isStripeServerConfigured()) {
    return NextResponse.json({ ok: false, error: "not_available" }, { status: 404 });
  }

  let body: { slug?: string; serviceId?: string };
  try {
    body = (await request.json()) as { slug?: string; serviceId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const slug = String(body.slug ?? "");
  const serviceId = String(body.serviceId ?? "");

  const data = await resolveBookingPage(slug).catch(() => null);
  if (!data) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (data.deposit.mode !== "charge" || !data.deposit.connectedAccountId) {
    // No card deposit for this business — the client should just book directly.
    return NextResponse.json({ ok: false, error: "not_chargeable" }, { status: 400 });
  }
  const service = data.services.find((s) => s.id === serviceId && s.active);
  if (!service) {
    return NextResponse.json({ ok: false, error: "invalid_service" }, { status: 400 });
  }
  const amountPence = Math.round(data.deposit.amount * 100);
  if (amountPence <= 0) {
    return NextResponse.json({ ok: false, error: "not_chargeable" }, { status: 400 });
  }

  try {
    const intent = await getStripe().paymentIntents.create(
      {
        amount: amountPence,
        currency: "gbp",
        // Card + wallets only (no redirect methods) so the deposit is a single
        // inline step — confirmPayment({ redirect: "if_required" }) never needs
        // a return_url or a second round-trip.
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        description: `Deposit — ${service.name} at ${data.business.name}`,
        metadata: {
          business_id: data.business.id,
          slug,
          service_id: serviceId,
          kind: "deposit",
        },
      },
      { stripeAccount: data.deposit.connectedAccountId },
    );

    return NextResponse.json({
      ok: true,
      clientSecret: intent.client_secret,
      amount: data.deposit.amount,
      publishableKey: data.deposit.publishableKey,
      connectedAccountId: data.deposit.connectedAccountId,
    });
  } catch (err) {
    console.error("deposit PaymentIntent create failed:", err);
    return NextResponse.json({ ok: false, error: "stripe_error" }, { status: 502 });
  }
}
