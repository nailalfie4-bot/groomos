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

/** Everything the public booking page needs to render for one business. */
export interface BookingPageData {
  business: Business;
  services: Service[];
  settings: Settings;
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

  return {
    business,
    services: ((svcs as unknown[]) ?? []).map((r) => rowToService(r as never)),
    settings: setting ? rowToSettings(setting as never) : defaultishSettings(),
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
}

export type CreateBookingResult =
  | { ok: true; appointmentId: string; depositDue: number; when: string }
  | { ok: false; error: "not_found" | "invalid_service" | "slot_taken" | "invalid_input"; message: string };

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
    .select("id, open_hour, close_hour")
    .eq("slug", input.slug.trim().toLowerCase())
    .maybeSingle();
  if (bizErr) throw bizErr;
  if (!biz) return { ok: false, error: "not_found", message: "This booking page doesn't exist." };
  const businessId = (biz as { id: string }).id;

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
    if (error) throw error;
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
    if (error) throw error;
    petId = (created as { id: string }).id;
  }

  // ── Create the appointment; the DB no-overlap constraint is the safety net ─
  const depositDue = settings.depositEnabled ? settings.depositAmount : 0;
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
    })
    .select("id")
    .single();

  if (apptErr) {
    if (isClashError(apptErr)) {
      return { ok: false, error: "slot_taken", message: "Sorry, that time was just taken — please pick another." };
    }
    throw apptErr;
  }

  return {
    ok: true,
    appointmentId: (appt as { id: string }).id,
    depositDue,
    when: start.toISOString(),
  };
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** A settings object when a business somehow has no row (shouldn't happen). */
function defaultishSettings(): Settings {
  return { ...DEFAULT_SETTINGS };
}
