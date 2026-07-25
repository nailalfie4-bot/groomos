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

/** The configured Stripe price id for a plan, or undefined if not set/blank. */
export function priceIdForPlan(plan: PlanId): string | undefined {
  const raw = process.env[PRICE_ENV[plan]]?.trim();
  return raw || undefined;
}

/** The name of the env var a plan's price id is read from (for diagnostics/logs). */
export function priceEnvVar(plan: PlanId): string {
  return PRICE_ENV[plan];
}

/** A masked preview of a price id — enough to recognise it, never the whole value.
 *  "price_1QabcdefGHIJ" → "price_1Qa…GHIJ". Price ids aren't secret, but masking
 *  keeps diagnostics/logs tidy and copy-paste-proof. */
export function maskPriceId(id: string | null | undefined): string | null {
  const s = (id ?? "").trim();
  if (!s) return null;
  return s.length <= 12 ? s : `${s.slice(0, 9)}…${s.slice(-4)}`;
}

/** Per-plan view of a plan's price-id env var at runtime, for the founder
 *  /api/stripe/status diagnostic — reveals no secret key. */
export interface PlanPriceStatus {
  plan: PlanId;
  envVar: string;
  /** The env var is present and non-blank. */
  set: boolean;
  /** It looks like a real price id ("price_…") — catches a product id or a typo. */
  valid: boolean;
  preview: string | null;
}

/** Whether each STRIPE_PRICE_* env var is present and well-formed *right now*.
 *  This is the single source of truth behind the diagnostic: if Starter won't
 *  open checkout, `starter.set === false` says STRIPE_PRICE_STARTER isn't being
 *  read at runtime. No full price ids, no keys. */
export function priceConfigStatus(): PlanPriceStatus[] {
  return (["starter", "pro", "team"] as PlanId[]).map((plan) => {
    const envVar = PRICE_ENV[plan];
    const raw = process.env[envVar]?.trim() ?? "";
    return {
      plan,
      envVar,
      set: Boolean(raw),
      valid: raw.startsWith("price_"),
      preview: maskPriceId(raw),
    };
  });
}

/** Reverse lookup: which plan a Stripe price id belongs to (for webhooks). */
export function planForPriceId(priceId: string | null | undefined): PlanId | undefined {
  if (!priceId) return undefined;
  for (const plan of ["starter", "pro", "team"] as PlanId[]) {
    if (process.env[PRICE_ENV[plan]]?.trim() === priceId) return plan;
  }
  return undefined;
}
