/**
 * Public booking data access — SERVER-ONLY (service-role).
 *
 * Powers the public /book/<slug> page and its API routes. An anonymous visitor
 * never talks to Supabase directly: these functions run on the server with the
 * service-role client, so no anonymous RLS is opened. Everything is still
 * scoped to the resolved business, and the DB's own no-overlap constraint makes
 * double-booking impossible even under a race.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rowToBusiness } from "@/lib/data/business";
import { rowToService } from "@/lib/data/services";
import { rowToSettings } from "@/lib/data/settings";
import { rowToAppointment, isClashError } from "@/lib/data/appointments";
import { computeQuote, DEFAULT_SETTINGS } from "@/lib/pricing";
import { findClash, SLOT_STEP_MIN } from "@/lib/schedule";
import { sendEmail } from "@/lib/email/send";
import { bookingConfirmationEmail } from "@/lib/email/templates";
import { getStripe, isStripeServerConfigured } from "@/lib/stripe/server";
import { depositModeFor, hasPublishableKey, type DepositMode } from "@/lib/stripe/connect";
import type { Business, CoatCondition, DogSize, Service, Settings } from "@/lib/types";

// The public page's slot math is anchored to UTC wall-clock: the server
// generates "HH:MM" candidates as instants ending in `Z`, and the client sends
// the chosen slot back the same way. This keeps availability and booking
// perfectly consistent and clash-safe. (Displaying times in the business's real
// timezone, e.g. Europe/London during BST, is a follow-up.)
function utcSlotInstant(dateStr: string, minutesFromMidnight: number): string {
  const hh = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
  const mm = String(minutesFromMidnight % 60).padStart(2, "0");
  return `${dateStr}T${hh}:${mm}:00.000Z`;
}

/** Client-safe deposit configuration for one business's booking page. */
export interface DepositConfig {
  /** 'charge' → card-charge at booking · 'recorded' → agreed, pay on the day · 'off'. */
  mode: DepositMode;
  /** Deposit amount in GBP (0 when off). */
  amount: number;
  /** Connected account id — present only in 'charge' mode (client inits Stripe with it). */
  connectedAccountId?: string;
  /** Publishable key — present only in 'charge' mode (client mounts the card element). */
  publishableKey?: string;
}

/** Everything the public booking page needs to render for one business. */
export interface BookingPageData {
  business: Business;
  services: Service[];
  settings: Settings;
  deposit: DepositConfig;
}

/** Resolve how a business handles deposits, from its settings + connected account. */
function resolveDeposit(
  settings: Settings,
  biz: { stripe_connect_account_id?: string | null; stripe_connect_charges_enabled?: boolean | null },
): DepositConfig {
  const amount = settings.depositEnabled ? settings.depositAmount : 0;
  const mode = depositModeFor({
    depositEnabled: settings.depositEnabled,
    depositAmount: settings.depositAmount,
    chargesEnabled: Boolean(biz.stripe_connect_charges_enabled),
    stripeConfigured: isStripeServerConfigured() && hasPublishableKey(),
  });
  return {
    mode,
    amount,
    connectedAccountId: mode === "charge" ? biz.stripe_connect_account_id ?? undefined : undefined,
    publishableKey: mode === "charge" ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined,
  };
}

/** Resolve a business + its active services + settings from a slug. */
export async function resolveBookingPage(slug: string): Promise<BookingPageData | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;
  const admin = createSupabaseAdminClient();

  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select("*")
    .eq("slug", clean)
    .maybeSingle();
  if (bizErr) throw bizErr;
  if (!biz) return null;

  const business = rowToBusiness(biz as never);
  business.slug = (biz as { slug?: string }).slug ?? clean;

  const [{ data: svcs }, { data: setting }] = await Promise.all([
    admin
      .from("services")
      .select("*")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    admin.from("settings").select("*").eq("business_id", business.id).maybeSingle(),
  ]);

  const settings = setting ? rowToSettings(setting as never) : defaultishSettings();
  return {
    business,
    services: ((svcs as unknown[]) ?? []).map((r) => rowToService(r as never)),
    settings,
    deposit: resolveDeposit(settings, biz as never),
  };
}

/** Free start times ("HH:MM") on a given YYYY-MM-DD for a groom of `durationMin`. */
export async function publicAvailableSlots(
  slug: string,
  dateStr: string,
  durationMin: number,
): Promise<string[] | null> {
  if (durationMin <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
  const admin = createSupabaseAdminClient();
  const { data: biz, error } = await admin
    .from("businesses")
    .select("id, open_hour, close_hour")
    .eq("slug", slug.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!biz) return null;
  const businessId = (biz as { id: string }).id;

  const [{ data: setting }, { data: appts }] = await Promise.all([
    admin.from("settings").select("*").eq("business_id", businessId).maybeSingle(),
    admin
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .neq("status", "cancelled"),
  ]);

  const settings = setting ? rowToSettings(setting as never) : defaultishSettings();
  const appointments = ((appts as unknown[]) ?? []).map((r) => rowToAppointment(r as never));
  const openMin = (biz as { open_hour: number }).open_hour * 60;
  const closeMin = (biz as { close_hour: number }).close_hour * 60;
  const nowMs = Date.now();

  const out: string[] = [];
  for (let m = openMin; m + durationMin <= closeMin; m += SLOT_STEP_MIN) {
    const startIso = utcSlotInstant(dateStr, m);
    if (new Date(startIso).getTime() <= nowMs) continue; // never offer a past slot
    if (!findClash(appointments, settings, startIso, durationMin)) {
      out.push(startIso.slice(11, 16)); // "HH:MM"
    }
  }
  return out;
}

export interface PublicBookingInput {
  slug: string;
  serviceId: string;
  startISO: string;
  size: DogSize;
  coat: CoatCondition;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  petName: string;
  breed: string;
  /** Stripe PaymentIntent id for a card-charged deposit (charge mode only). */
  paymentIntentId?: string;
}

export type CreateBookingResult =
  | { ok: true; appointmentId: string; depositDue: number; depositPaid: boolean; when: string }
  | { ok: false; error: "not_found" | "invalid_service" | "slot_taken" | "invalid_input" | "payment_required"; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Create a booking (client + pet + pending appointment) for a slug. */
export async function createPublicBooking(input: PublicBookingInput): Promise<CreateBookingResult> {
  // ── Validate the visitor's input up front ────────────────────────────────
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const petName = input.petName?.trim() ?? "";
  const breed = input.breed?.trim() || "Unknown";
  const start = new Date(input.startISO);
  // The public form collects a single "name" field, so only a first name is
  // guaranteed; last name may be blank. Everything else stays required.
  if (
    !firstName || !petName || !phone ||
    !EMAIL_RE.test(email) ||
    Number.isNaN(start.getTime())
  ) {
    return { ok: false, error: "invalid_input", message: "Please check the form and try again." };
  }
  if (start.getTime() <= Date.now()) {
    return { ok: false, error: "invalid_input", message: "Please choose a time in the future." };
  }

  const admin = createSupabaseAdminClient();

  // ── Resolve the business ─────────────────────────────────────────────────
  const { data: biz, error: bizErr } = await admin
    .from("businesses")
    .select(
      "id, name, open_hour, close_hour, address_line, city, postcode, stripe_connect_account_id, stripe_connect_charges_enabled",
    )
    .eq("slug", input.slug.trim().toLowerCase())
    .maybeSingle();
  if (bizErr) throw bizErr;
  if (!biz) return { ok: false, error: "not_found", message: "This booking page doesn't exist." };
  const businessId = (biz as { id: string }).id;
  const connectedAccountId =
    (biz as { stripe_connect_account_id?: string | null }).stripe_connect_account_id ?? undefined;

  // ── The service must belong to this business and be active ───────────────
  const { data: svc, error: svcErr } = await admin
    .from("services")
    .select("*")
    .eq("id", input.serviceId)
    .eq("business_id", businessId)
    .eq("active", true)
    .maybeSingle();
  if (svcErr) throw svcErr;
  if (!svc) return { ok: false, error: "invalid_service", message: "That service isn't available." };
  const service = rowToService(svc as never);

  const { data: setting } = await admin
    .from("settings").select("*").eq("business_id", businessId).maybeSingle();
  const settings = setting ? rowToSettings(setting as never) : defaultishSettings();

  // Price + duration (matting/size surcharges baked in) from the same meter the
  // staff console uses.
  const quote = computeQuote(service, input.size, input.coat, settings, petName);

  // The whole groom must fit inside opening hours (UTC wall-clock, matching how
  // availability is generated above).
  const openMin = (biz as { open_hour: number }).open_hour * 60;
  const closeMin = (biz as { close_hour: number }).close_hour * 60;
  const startMin = start.getUTCHours() * 60 + start.getUTCMinutes();
  if (startMin < openMin || startMin + quote.totalDurationMin > closeMin) {
    return { ok: false, error: "invalid_input", message: "That time is outside opening hours." };
  }

  // ── Deposit: decide charge vs recorded, and (charge mode) verify the card
  //    was actually taken BEFORE we create any rows. Failed/absent payment in
  //    charge mode = no confirmed booking. ──────────────────────────────────
  const depositMode = depositModeFor({
    depositEnabled: settings.depositEnabled,
    depositAmount: settings.depositAmount,
    chargesEnabled: Boolean((biz as { stripe_connect_charges_enabled?: boolean | null }).stripe_connect_charges_enabled),
    stripeConfigured: isStripeServerConfigured() && hasPublishableKey(),
  });
  const depositDue = depositMode === "off" ? 0 : settings.depositAmount;
  const paymentIntentId = input.paymentIntentId?.trim();

  if (depositMode === "charge") {
    if (!paymentIntentId || !connectedAccountId) {
      return { ok: false, error: "payment_required", message: "Please pay the deposit to confirm your booking." };
    }
    // One PaymentIntent confirms at most one booking (the unique index is the
    // hard guard; this gives a friendly message in the common case).
    const { data: dupe } = await admin
      .from("appointments")
      .select("id")
      .eq("deposit_payment_intent_id", paymentIntentId)
      .limit(1)
      .maybeSingle();
    if (dupe) {
      return { ok: false, error: "invalid_input", message: "This deposit has already been used to book." };
    }
    let intent: { status?: string; currency?: string; amount?: number; amount_received?: number };
    try {
      intent = await getStripe().paymentIntents.retrieve(paymentIntentId, undefined, {
        stripeAccount: connectedAccountId,
      });
    } catch {
      return { ok: false, error: "payment_required", message: "We couldn't verify your deposit — please try again." };
    }
    const expected = Math.round(depositDue * 100);
    const paidAmount = intent.amount_received || intent.amount || 0;
    if (intent.status !== "succeeded" || intent.currency !== "gbp" || paidAmount !== expected) {
      return { ok: false, error: "payment_required", message: "Your deposit payment wasn't completed — please try again." };
    }
  }

  // In charge mode the card is already charged, so ANY failure while writing the
  // booking must give the client their deposit back — never keep money without a
  // confirmed booking.
  const refundDepositIfCharged = async () => {
    if (depositMode === "charge" && paymentIntentId && connectedAccountId) {
      try {
        await getStripe().refunds.create(
          { payment_intent: paymentIntentId },
          { stripeAccount: connectedAccountId },
        );
      } catch (e) {
        console.error("deposit refund failed:", e);
      }
    }
  };

  // ── Reuse-or-create the client (by email within this business) ───────────
  const { data: existingClient } = await admin
    .from("clients")
    .select("id")
    .eq("business_id", businessId)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  let clientId = (existingClient as { id: string } | null)?.id;
  if (!clientId) {
    const { data: created, error } = await admin
      .from("clients")
      .insert({ business_id: businessId, first_name: firstName, last_name: lastName, email, phone })
      .select("id")
      .single();
    if (error) {
      await refundDepositIfCharged();
      throw error;
    }
    clientId = (created as { id: string }).id;
  }

  // ── Reuse-or-create the pet (by name for this client) ────────────────────
  const { data: existingPet } = await admin
    .from("pets")
    .select("id")
    .eq("business_id", businessId)
    .eq("client_id", clientId)
    .ilike("name", petName)
    .limit(1)
    .maybeSingle();

  let petId = (existingPet as { id: string } | null)?.id;
  if (!petId) {
    const { data: created, error } = await admin
      .from("pets")
      .insert({ business_id: businessId, client_id: clientId, name: petName, breed, size: input.size })
      .select("id")
      .single();
    if (error) {
      await refundDepositIfCharged();
      throw error;
    }
    petId = (created as { id: string }).id;
  }

  // ── Create the appointment; the DB no-overlap constraint is the safety net ─
  const { data: appt, error: apptErr } = await admin
    .from("appointments")
    .insert({
      business_id: businessId,
      client_id: clientId,
      pet_id: petId,
      service_id: service.id,
      start_at: start.toISOString(),
      status: "pending",
      source: "online",
      notes: "",
      price_gbp: quote.totalPriceGBP,
      coat_condition: input.coat,
      duration_min: quote.totalDurationMin,
      deposit: depositDue > 0 ? depositDue : null,
      deposit_status: depositMode === "charge" ? "paid" : depositMode === "recorded" ? "recorded" : "none",
      deposit_payment_intent_id: depositMode === "charge" ? paymentIntentId : null,
    })
    .select("id")
    .single();

  if (apptErr) {
    // Card already charged but we can't hold the slot (or the write failed) —
    // refund before surfacing the error, either way.
    await refundDepositIfCharged();
    if (isClashError(apptErr)) {
      return { ok: false, error: "slot_taken", message: "Sorry, that time was just taken — please pick another." };
    }
    throw apptErr;
  }

  // Confirmation email to the client — best-effort, never blocks the booking
  // (and a safe no-op until email is configured).
  try {
    const b = biz as { name?: string; address_line?: string; city?: string; postcode?: string };
    const when = start.toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC",
    });
    const msg = bookingConfirmationEmail({
      businessName: b.name ?? "Your groomer",
      firstName,
      petName,
      serviceName: service.name,
      whenLabel: when,
      address: [b.address_line, b.city, b.postcode].filter(Boolean).join(", ") || undefined,
      depositLabel:
        depositDue > 0
          ? depositMode === "charge"
            ? `Your £${depositDue} deposit has been paid — it secures your slot and comes off your total.`
            : `A £${depositDue} deposit secures your slot.`
          : undefined,
    });
    await sendEmail({ to: email, subject: msg.subject, html: msg.html });
  } catch (err) {
    console.error("booking confirmation email failed:", err);
  }

  return {
    ok: true,
    appointmentId: (appt as { id: string }).id,
    depositDue,
    depositPaid: depositMode === "charge",
    when: start.toISOString(),
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** A settings object when a business somehow has no row (shouldn't happen). */
function defaultishSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}
