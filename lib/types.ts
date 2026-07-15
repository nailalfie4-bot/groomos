/**
 * GroomOS domain types.
 *
 * These describe the shape of every entity in the app. The mock store in
 * `lib/mock/store.tsx` holds them in memory; when swapping to a real database
 * later, these same types map directly to table rows / API responses, so the
 * UI layer needs no changes.
 */

export type ID = string;

/** The grooming business the demo user "owns". */
export interface Business {
  id: ID;
  name: string;
  /** URL-safe handle for the public booking page at /book/<slug>. */
  slug?: string;
  /** Current Stripe subscription plan id, if subscribed. */
  plan?: string;
  /** Stripe subscription status: 'active' | 'past_due' | 'canceled' | …. */
  subscriptionStatus?: string;
  /** ISO datetime the current period ends / renews. */
  currentPeriodEnd?: string;
  /** The groomer's connected Stripe (Express) account id, once they connect. */
  stripeConnectAccountId?: string;
  /** True once the connected account can accept charges (card deposits go live). */
  stripeConnectChargesEnabled?: boolean;
  /** Working day start/end in 24h decimal hours, e.g. 9 and 17. */
  openHour: number;
  closeHour: number;
  /** Number of grooming stations — used for utilisation capacity. */
  stations: number;
  addressLine: string;
  city: string;
  postcode: string;
  phone: string;
}

export interface Client {
  id: ID;
  businessId: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** ISO date string. */
  createdAt: string;
}

export type DogSize = "small" | "medium" | "large" | "giant";

/** Owner-declared coat condition used by the matting meter (no AI involved). */
export type CoatCondition = "smooth" | "tangled" | "matted";

export interface Pet {
  id: ID;
  clientId: ID;
  name: string;
  breed: string;
  size: DogSize;
  /** Coat type, e.g. "Curly", "Double", "Wiry" — quick grooming context. */
  coatType?: string;
  /** One-word temperament, e.g. "Easygoing", "Nervous" — sets the tone. */
  temperament?: string;
  /** Free-text standing notes: temperament, allergies, coat, handling. */
  notes: string;
  /** ISO date string of birth (optional). */
  dateOfBirth?: string;
}

/**
 * Groomer-configurable pricing & scheduling rules. These power the matting
 * meter and the calendar's automatic buffer time. A single solo groomer owns
 * one of these; defaults match the brief.
 */
export interface Settings {
  /** Cleanup/buffer minutes automatically reserved after every appointment. */
  bufferMin: number;
  tangledFee: number;
  tangledExtraMin: number;
  mattedFee: number;
  mattedExtraMin: number;
  giantFee: number;
  giantExtraMin: number;
  /** Reminders are always on and included — surfaced as a selling point. */
  remindersEnabled: boolean;
  /** Default weeks between grooms, used for rebooking suggestions. */
  defaultRebookWeeks: number;
  /** Require a deposit to confirm a booking (no-show protection). */
  depositEnabled: boolean;
  /** Deposit amount (GBP) — applied to the groom, or kept on a no-show. */
  depositAmount: number;
  /** Cancellation notice required (hours), shown to clients at booking. */
  cancellationNoticeHours: number;
}

/** A delightful before/after report card the owner receives after a groom. */
export interface GroomingReport {
  /** Mock photo data URLs / placeholders. */
  beforePhoto?: string;
  afterPhoto?: string;
  summary: string;
  createdAt: string;
}

export interface Service {
  id: ID;
  businessId: ID;
  name: string;
  description: string;
  durationMin: number;
  priceGBP: number;
  active: boolean;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "no-show"
  | "cancelled";

/** Where the booking came from — staff console or the public self-book page. */
export type AppointmentSource = "staff" | "online";

export interface Appointment {
  id: ID;
  businessId: ID;
  petId: ID;
  clientId: ID;
  serviceId: ID;
  /** ISO datetime of the slot start. End is derived from `durationMin`. */
  start: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  /** Per-visit notes (what was done, observations). */
  notes: string;
  /** Total price captured at booking, incl. matting/size surcharges. */
  priceGBP: number;
  /** Owner-declared coat condition at booking (drives the matting meter). */
  coatCondition: CoatCondition;
  /** Total minutes reserved (service + matting/size extension), excl. buffer. */
  durationMin: number;
  /** Optional before/after report attached on completion. */
  report?: GroomingReport;
  /** Mock reminder timestamp — when a "friendly reminder" was sent. */
  reminderSentAt?: string;
  /** Deposit taken to secure the booking (GBP). Applied on completion, kept on a no-show. */
  deposit?: number;
  /** How the deposit was handled: 'none' | 'recorded' (agreed, not charged) | 'paid' (card-charged). */
  depositStatus?: "none" | "recorded" | "paid";
  /** Stripe PaymentIntent id for a card-charged deposit, if any. */
  depositPaymentIntentId?: string;
}

/** Transparent price + time breakdown produced by the matting meter. */
export interface BookingQuote {
  basePriceGBP: number;
  baseDurationMin: number;
  mattingFee: number;
  mattingExtraMin: number;
  sizeFee: number;
  sizeExtraMin: number;
  totalPriceGBP: number;
  totalDurationMin: number;
  /** Warm, owner-facing explanation of any surcharge (empty if none). */
  reason: string;
}

/** A pet's history row, derived by joining appointments + services. */
export interface GroomingHistoryEntry {
  appointment: Appointment;
  service: Service;
}
