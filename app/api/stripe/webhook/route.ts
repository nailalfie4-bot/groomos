/**
 * POST /api/stripe/webhook — Stripe subscription events.
 *
 * Verifies the signature with STRIPE_WEBHOOK_SECRET, then updates the matching
 * business's subscription state. Everything is derived from the event payload
 * and the metadata we set at checkout (business_id, plan), so the handler makes
 * no follow-up Stripe API calls and is safe to replay (idempotent).
 *
 * Handled: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted, invoice.payment_failed.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe, planForPriceId } from "@/lib/stripe/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** current_period_end has lived in different places across API versions. */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const s = sub as unknown as {
    current_period_end?: number;
    items?: { data?: { current_period_end?: number }[] };
  };
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/** Run a Supabase write and throw on error, so the webhook returns 500 and
 *  Stripe retries rather than silently dropping the update. */
async function must(p: PromiseLike<{ error: unknown }>) {
  const { error } = await p;
  if (error) throw error;
}

/** Find the business for a subscription (by our metadata, else by sub id). */
async function updateBySubscription(
  admin: SupabaseClient,
  sub: Stripe.Subscription,
  patch: Record<string, unknown>,
) {
  const businessId = sub.metadata?.business_id;
  if (businessId) {
    await must(
      admin
        .from("businesses")
        .update({ ...patch, stripe_subscription_id: sub.id })
        .eq("id", businessId),
    );
  } else {
    await must(admin.from("businesses").update(patch).eq("stripe_subscription_id", sub.id));
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  // Raw body is required for signature verification.
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const businessId = s.metadata?.business_id ?? s.client_reference_id ?? undefined;
        if (businessId) {
          await must(
            admin
              .from("businesses")
              .update({
                stripe_customer_id:
                  typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
                stripe_subscription_id:
                  typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null,
                plan: s.metadata?.plan ?? null,
                subscription_status: "active",
              })
              .eq("id", businessId),
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = planForPriceId(priceId) ?? sub.metadata?.plan ?? null;
        await updateBySubscription(admin, sub, {
          plan,
          subscription_status: sub.status,
          current_period_end: periodEndISO(sub),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateBySubscription(admin, sub, {
          subscription_status: "canceled",
          plan: null,
          current_period_end: periodEndISO(sub),
        });
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) {
          await must(
            admin
              .from("businesses")
              .update({ subscription_status: "past_due" })
              .eq("stripe_customer_id", customerId),
          );
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
