/**
 * Stripe server client + server-only helpers. SERVER-ONLY.
 *
 * Reads STRIPE_SECRET_KEY (never NEXT_PUBLIC) and the per-plan price IDs. If
 * this module were ever imported into client code the secret would be
 * undefined and getStripe() would throw, so it can only work on the server.
 */
import Stripe from "stripe";
import type { PlanId } from "./config";

let client: Stripe | undefined;

/** Whether the server can talk to Stripe (secret key present). */
export function isStripeServerConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** A singleton Stripe client, pinned to the SDK's API version. */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return client;
}

// Each plan's live price id comes from an env var, so no ids are hard-coded.
const PRICE_ENV: Record<PlanId, string> = {
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
  team: "STRIPE_PRICE_TEAM",
};

/** The configured Stripe price id for a plan, or undefined if not set. */
export function priceIdForPlan(plan: PlanId): string | undefined {
  return process.env[PRICE_ENV[plan]];
}

/** Reverse lookup: which plan a Stripe price id belongs to (for webhooks). */
export function planForPriceId(priceId: string | null | undefined): PlanId | undefined {
  if (!priceId) return undefined;
  for (const plan of ["starter", "pro", "team"] as PlanId[]) {
    if (process.env[PRICE_ENV[plan]] === priceId) return plan;
  }
  return undefined;
}
