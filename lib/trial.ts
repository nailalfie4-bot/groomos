/**
 * Trial + subscription status helpers. Pure (no I/O, no deps), so they're safe
 * in the edge middleware, server components and client components alike.
 *
 * A business gets a 30-day free trial (businesses.trial_ends_at). Once it passes
 * with no active subscription, the main app is gated — but the public booking
 * pages keep working, so live client bookings never break.
 */
const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

/**
 * Internal / owner accounts: permanent, unrestricted access that never trial-
 * expires. This plan value is NOT a Stripe plan and there is no UI that can set
 * it — it can only be written directly in the database (e.g. the founder's own
 * account), so a customer can never grant it to themselves.
 */
const INTERNAL_PLANS = ["internal", "owner"];
export function isInternalPlan(plan?: string | null): boolean {
  return !!plan && INTERNAL_PLANS.includes(plan);
}

/** True when the business has a usable paid subscription. */
export function isSubscribed(status?: string | null, plan?: string | null): boolean {
  return !!plan && !!status && ACTIVE_STATUSES.includes(status);
}

/** True when the free trial's end date is in the past. */
export function isTrialExpired(trialEndsAt?: string | null): boolean {
  if (!trialEndsAt) return false; // unknown trial date → don't lock (safety)
  const t = new Date(trialEndsAt).getTime();
  return Number.isFinite(t) && t < Date.now();
}

/** Whole days left on the trial (0 once it's over). */
export function trialDaysLeft(trialEndsAt?: string | null): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** The main app is locked when the trial is over and there's no active plan. */
export function isAppLocked(opts: {
  subscriptionStatus?: string | null;
  plan?: string | null;
  trialEndsAt?: string | null;
}): boolean {
  if (isInternalPlan(opts.plan)) return false; // internal/owner never locks
  return (
    !isSubscribed(opts.subscriptionStatus, opts.plan) && isTrialExpired(opts.trialEndsAt)
  );
}

/**
 * Multi-groomer (staff assignment) is a Pro/Team feature — and it's available
 * during the free trial (full access) and in the public demo (to showcase it).
 * A Starter subscriber is the only in-app case that's locked out.
 */
export function canUseGroomers(opts: {
  subscriptionStatus?: string | null;
  plan?: string | null;
  trialEndsAt?: string | null;
  configured: boolean;
}): boolean {
  if (!opts.configured) return true; // demo
  if (isInternalPlan(opts.plan)) return true; // internal/owner: everything on
  if (isSubscribed(opts.subscriptionStatus, opts.plan)) {
    return opts.plan === "pro" || opts.plan === "team";
  }
  return !isTrialExpired(opts.trialEndsAt); // full access during the trial
}
