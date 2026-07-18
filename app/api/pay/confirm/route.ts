/**
 * POST /api/pay/confirm — record a paid deposit-link payment.
 *
 * Called after Stripe confirms the card on the client. Re-verifies the
 * PaymentIntent on the connected account server-side, then marks the
 * appointment's deposit as paid. Never trusts the client's word for it.
 *
 * Body: { token, paymentIntentId }.
 */
import { NextResponse } from "next/server";
import { confirmDepositLinkPayment } from "@/lib/data/deposit-links";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { isStripeServerConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured() || !isStripeServerConfigured()) {
    return NextResponse.json({ ok: false, error: "not_available" }, { status: 404 });
  }

  let body: { token?: string; paymentIntentId?: string };
  try {
    body = (await request.json()) as { token?: string; paymentIntentId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  try {
    const result = await confirmDepositLinkPayment(
      String(body.token ?? ""),
      String(body.paymentIntentId ?? ""),
    );
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("deposit link confirm failed:", err);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Something went wrong — please try again." },
      { status: 500 },
    );
  }
}
