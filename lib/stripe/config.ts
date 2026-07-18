/**
 * Stripe plan metadata + client-safe config.
 *
 * This module is safe to import from client components: it only ever reads the
 * NEXT_PUBLIC_ publishable key. The secret key, price IDs and the Stripe SDK
 * live in `lib/stripe/server.ts` (server-only).
 */

export type PlanId = "starter" | "pro" | "team";

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "team"];

export interface PlanMeta {
  id: PlanId;
  name: string;
  priceGBP: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

/** Plans shown on the billing screen — prices match the landing page tiers. */
export const PLANS: Record<PlanId, PlanMeta> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceGBP: 29,
    tagline: "The essentials, beautifully organised.",
    features: [
      "Smart colour-coded calendar",
      "24/7 online booking page",
      "Deposits & no-show protection",
      "Unlimited client & pet records",
      "Email reminders",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceGBP: 39,
    tagline: "Everything that saves time and makes money.",
    features: [
      "Everything in Starter",
      "SMS reminders",
      "Matting meter & smart pricing",
      "Rebooking engine",
      "Before & after reports",
    ],
    highlighted: true,
  },
  team: {
    id: "team",
    name: "Team",
    priceGBP: 59,
    tagline: "For growing teams — multi-groomer support coming soon.",
    features: [
      "Everything in Pro",
      "Multi-groomer support (coming soon)",
      "Multiple locations (coming soon)",
      "Priority support",
    ],
  },
};

/** True when the Stripe publishable key is present (client-safe). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
