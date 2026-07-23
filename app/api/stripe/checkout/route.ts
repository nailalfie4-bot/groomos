/**
 * POST /api/stripe/checkout  — start a subscription Checkout Session.
 *
 * Body: { plan: "starter" | "pro" | "team" }
 * Auth: the logged-in Supabase user (their business is charged). Returns the
 * Checkout URL to redirect to. All money flows to the GroomOS platform account.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeServerConfigured, priceIdForPlan, priceEnvVar, maskPriceId } from "@/lib/stripe/server";
import type { PlanId } from "@/lib/stripe/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStripeServerConfigured()) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }

  let body: { plan?: string };
  try {
    body = (await request.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const plan = body.plan as PlanId;
  if (plan !== "starter" && plan !== "pro" && plan !== "team") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }
  const priceId = priceIdForPlan(plan);
  // Server-side breadcrumb (Vercel function logs): exactly which env var each
  // plan resolves from and whether it produced a price id at runtime. This is
  // how a "Starter won't open checkout" report gets traced to a missing/blank
  // STRIPE_PRICE_STARTER — every plan takes this identical path, there is no
  // tier-specific branching below.
  console.info("stripe checkout requested", {
    plan,
    envVar: priceEnvVar(plan),
    priceIdResolved: Boolean(priceId),
    priceIdPreview: maskPriceId(priceId),
  });
  if (!priceId) {
    return NextResponse.json(
      { error: "price_not_configured", plan, envVar: priceEnvVar(plan) },
      { status: 503 },
    );
  }

  // Authenticate the caller and resolve their business.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  const businessId = (userRow as { business_id?: string } | null)?.business_id;
  if (!businessId) return NextResponse.json({ error: "no_business" }, { status: 400 });

  const { data: biz } = await admin
    .from("businesses")
    .select("id, name, stripe_customer_id")
    .eq("id", businessId)
    .maybeSingle();

  const stripe = getStripe();
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;

  // Every Stripe call is wrapped so a real error (bad/wrong-mode price id, a
  // test-vs-live key mismatch, etc.) comes back as a specific message instead
  // of an unhandled 500 that the client can only show as "couldn't reach
  // billing". These are Stripe's own messages — safe to show the account owner.
  try {
    // Reuse this business's Stripe customer, or create one and remember it.
    let customerId =
      (biz as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: (biz as { name?: string } | null)?.name ?? undefined,
        metadata: { business_id: businessId },
      });
      customerId = customer.id;
      await admin.from("businesses").update({ stripe_customer_id: customerId }).eq("id", businessId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: businessId,
      metadata: { business_id: businessId, plan },
      subscription_data: { metadata: { business_id: businessId, plan } },
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout session create failed:", err);
    return NextResponse.json({ error: "stripe_error", ...stripeErrorDetail(err) }, { status: 502 });
  }
}

/** Pull the human-readable reason out of a Stripe error (safe for the owner). */
function stripeErrorDetail(err: unknown): { message?: string; code?: string; type?: string } {
  const e = err as { message?: string; code?: string; type?: string; raw?: { message?: string } };
  return { message: e?.raw?.message ?? e?.message, code: e?.code, type: e?.type };
}
