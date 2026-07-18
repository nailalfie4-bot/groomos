"use client";

import { PLANS, type PlanId } from "@/lib/stripe/config";
import { isSubscribed, isTrialExpired, trialDaysLeft } from "@/lib/trial";
import { cn } from "@/lib/utils";
import type { Business } from "@/lib/types";

/**
 * The groomer's current plan shown as a small pill: their plan name once
 * subscribed, "Trial — X days left" during the free trial, or "Trial ended".
 * Renders nothing in the demo / before the business has loaded (no plan and no
 * trial date), so it never flashes a placeholder.
 */
export function PlanBadge({ business, className }: { business: Business; className?: string }) {
  if (!business.plan && !business.trialEndsAt) return null;

  const subscribed = isSubscribed(business.subscriptionStatus, business.plan);
  let label: string;
  let tone: "plan" | "trial" | "ended";

  if (subscribed && business.plan) {
    label = PLANS[business.plan as PlanId]?.name ?? "Active";
    tone = "plan";
  } else if (!isTrialExpired(business.trialEndsAt)) {
    const d = trialDaysLeft(business.trialEndsAt);
    label = `Trial — ${d} day${d === 1 ? "" : "s"} left`;
    tone = "trial";
  } else {
    label = "Trial ended";
    tone = "ended";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "plan"
          ? "bg-accent-100 text-accent-700"
          : tone === "trial"
            ? "bg-surface-sunken text-ink-muted"
            : "bg-danger-soft text-danger",
        className,
      )}
    >
      {label}
    </span>
  );
}
