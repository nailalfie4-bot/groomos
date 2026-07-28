/**
 * Founder customer-health model — pure, no I/O.
 *
 * Turns a raw aggregated row (from the founder_customer_health() RPC) into the
 * view model the dashboard renders: a red/amber/green signal, a human plan
 * label, a trial countdown, and "days since last login". No customer PII beyond
 * business name + owner email (needed to support them) ever passes through here.
 */
import { isInternalPlan, isSubscribed, isTrialExpired, trialDaysLeft } from "@/lib/trial";

export type HealthStatus = "green" | "amber" | "red";
export type PlanLabel = "trial" | "starter" | "pro" | "team" | "internal" | "expired";

/** Snake-case row exactly as the RPC returns it. */
export interface CustomerHealthRow {
  business_id: string;
  business_name: string | null;
  owner_email: string | null;
  signup_at: string | null;
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  last_sign_in_at: string | null;
  login_count: number | string | null;
  first_login_at: string | null;
  clients_count: number | string | null;
  pets_count: number | string | null;
  bookings_count: number | string | null;
  completed_count: number | string | null;
  online_bookings_count: number | string | null;
  deposits_enabled: boolean | null;
  has_booking_page: boolean | null;
  priced_services_count: number | string | null;
  first_client_at: string | null;
  first_booking_at: string | null;
}

/** Computed, camelCase view model sent to the client. */
export interface CustomerHealth {
  businessId: string;
  businessName: string;
  ownerEmail: string | null;
  signupAt: string | null;
  plan: PlanLabel;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  /** True for a trial with 7 or fewer days left. */
  trialEndingSoon: boolean;
  lastSignInAt: string | null;
  /** Whole days since last login; null when they've never logged in. */
  daysSinceLogin: number | null;
  loginCount: number;
  firstLoginAt: string | null;
  clientsCount: number;
  petsCount: number;
  bookingsCount: number;
  completedCount: number;
  onlineBookingsCount: number;
  depositsEnabled: boolean;
  hasBookingPage: boolean;
  hasRealOnlineBooking: boolean;
  firstClientAt: string | null;
  firstBookingAt: string | null;
  health: HealthStatus;
}

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "string" ? Number(v) : v;

/** Whole days between now and an ISO datetime (null when the input is null). */
export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

/** The human plan label, from the same rules the app gates on (lib/trial). */
export function planLabel(
  plan: string | null,
  subscriptionStatus: string | null,
  trialEndsAt: string | null,
): PlanLabel {
  if (isInternalPlan(plan)) return "internal";
  if (isSubscribed(subscriptionStatus, plan)) {
    if (plan === "starter" || plan === "pro" || plan === "team") return plan;
    return "starter"; // subscribed but unrecognised plan string → safest label
  }
  if (!isTrialExpired(trialEndsAt)) return "trial";
  return "expired";
}

/**
 * The health signal:
 *   green — logged in within 3 days AND 3+ clients AND 1+ booking
 *   red   — no login for 7+ days (incl. never), OR zero clients
 *   amber — anything in between (some activity, not yet thriving)
 */
export function computeHealth(o: {
  daysSinceLogin: number | null;
  clientsCount: number;
  bookingsCount: number;
}): HealthStatus {
  if (o.clientsCount === 0) return "red";
  if (o.daysSinceLogin === null || o.daysSinceLogin >= 7) return "red";
  if (o.daysSinceLogin <= 3 && o.clientsCount >= 3 && o.bookingsCount >= 1) return "green";
  return "amber";
}

export function toCustomerHealth(r: CustomerHealthRow): CustomerHealth {
  const clientsCount = num(r.clients_count);
  const bookingsCount = num(r.bookings_count);
  const daysSinceLogin = daysSince(r.last_sign_in_at);
  const plan = planLabel(r.plan, r.subscription_status, r.trial_ends_at);
  const daysLeft = trialDaysLeft(r.trial_ends_at);
  return {
    businessId: r.business_id,
    businessName: r.business_name ?? "Unnamed business",
    ownerEmail: r.owner_email,
    signupAt: r.signup_at,
    plan,
    trialEndsAt: r.trial_ends_at,
    trialDaysLeft: daysLeft,
    trialEndingSoon: plan === "trial" && daysLeft <= 7,
    lastSignInAt: r.last_sign_in_at,
    daysSinceLogin,
    loginCount: num(r.login_count),
    firstLoginAt: r.first_login_at,
    clientsCount,
    petsCount: num(r.pets_count),
    bookingsCount,
    completedCount: num(r.completed_count),
    onlineBookingsCount: num(r.online_bookings_count),
    depositsEnabled: Boolean(r.deposits_enabled),
    hasBookingPage: Boolean(r.has_booking_page),
    hasRealOnlineBooking: num(r.online_bookings_count) > 0,
    firstClientAt: r.first_client_at,
    firstBookingAt: r.first_booking_at,
    health: computeHealth({ daysSinceLogin, clientsCount, bookingsCount }),
  };
}

const HEALTH_RANK: Record<HealthStatus, number> = { red: 0, amber: 1, green: 2 };

/** Red first (most in need), then the most stale, then trial urgency, then name. */
export function sortByHealth(list: CustomerHealth[]): CustomerHealth[] {
  return [...list].sort((a, b) => {
    if (HEALTH_RANK[a.health] !== HEALTH_RANK[b.health]) {
      return HEALTH_RANK[a.health] - HEALTH_RANK[b.health];
    }
    const da = a.daysSinceLogin ?? Number.POSITIVE_INFINITY;
    const db = b.daysSinceLogin ?? Number.POSITIVE_INFINITY;
    if (da !== db) return db - da; // most days-since-login first
    if (a.trialDaysLeft !== b.trialDaysLeft) return a.trialDaysLeft - b.trialDaysLeft;
    return a.businessName.localeCompare(b.businessName);
  });
}

/** Sample data so the dashboard is viewable in demo mode (no Supabase). */
export function demoCustomers(): CustomerHealth[] {
  const day = 86_400_000;
  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  const rows: CustomerHealthRow[] = [
    {
      business_id: "demo-1", business_name: "Muddy Paws", owner_email: "woof@muddypaws.uk",
      signup_at: iso(9 * day), plan: null, subscription_status: null, trial_ends_at: new Date(now + 21 * day).toISOString(),
      last_sign_in_at: iso(11 * day), login_count: 2, first_login_at: iso(9 * day),
      clients_count: 0, pets_count: 0, bookings_count: 0, completed_count: 0, online_bookings_count: 0,
      deposits_enabled: false, has_booking_page: false, priced_services_count: 0,
      first_client_at: null, first_booking_at: null,
    },
    {
      business_id: "demo-2", business_name: "Snippets Dog Grooming", owner_email: "bella@snippets.dog",
      signup_at: iso(25 * day), plan: null, subscription_status: null, trial_ends_at: new Date(now + 5 * day).toISOString(),
      last_sign_in_at: iso(2 * day), login_count: 6, first_login_at: iso(25 * day),
      clients_count: 2, pets_count: 3, bookings_count: 1, completed_count: 0, online_bookings_count: 0,
      deposits_enabled: false, has_booking_page: false, priced_services_count: 2,
      first_client_at: iso(20 * day), first_booking_at: iso(6 * day),
    },
    {
      business_id: "demo-3", business_name: "Paws & Co. Grooming", owner_email: "hello@pawsandco.co.uk",
      signup_at: iso(40 * day), plan: "pro", subscription_status: "active", trial_ends_at: iso(10 * day),
      last_sign_in_at: iso(6 * 3600_000), login_count: 34, first_login_at: iso(40 * day),
      clients_count: 28, pets_count: 41, bookings_count: 63, completed_count: 51, online_bookings_count: 12,
      deposits_enabled: true, has_booking_page: true, priced_services_count: 5,
      first_client_at: iso(39 * day), first_booking_at: iso(38 * day),
    },
    {
      business_id: "demo-4", business_name: "The Dog House", owner_email: "clip@thedoghouse.co.uk",
      signup_at: iso(3 * day), plan: null, subscription_status: null, trial_ends_at: new Date(now + 27 * day).toISOString(),
      last_sign_in_at: iso(1 * day), login_count: 3, first_login_at: iso(3 * day),
      clients_count: 4, pets_count: 5, bookings_count: 2, completed_count: 1, online_bookings_count: 1,
      deposits_enabled: true, has_booking_page: true, priced_services_count: 3,
      first_client_at: iso(2 * day), first_booking_at: iso(2 * day),
    },
  ];
  return sortByHealth(rows.map(toCustomerHealth));
}
