/**
 * Appointments data access — tenant-scoped. This stage provides reads (used by
 * the Clients history view and, later, the calendar/dashboard). Booking writes
 * with server-side clash/buffer enforcement are added in the Appointments step.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Appointment } from "@/lib/types";

export interface AppointmentRow {
  id: string;
  business_id: string;
  client_id: string;
  pet_id: string;
  service_id: string | null;
  start_at: string;
  status: Appointment["status"];
  source: Appointment["source"];
  notes: string | null;
  price_gbp: number | string;
  coat_condition: Appointment["coatCondition"];
  duration_min: number;
  deposit: number | string | null;
  deposit_status: string | null;
  deposit_payment_intent_id: string | null;
  reminder_sent_at: string | null;
  report: Appointment["report"] | null;
  declarations: string[] | null;
  terms_text: string | null;
  terms_signed_name: string | null;
  terms_accepted_at: string | null;
  matting_level: string | null;
  temperament_level: string | null;
  addons: { name: string; price: number }[] | null;
  deposit_link_token: string | null;
  deposit_link_expires_at: string | null;
}

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "string" ? Number(v) : v;

export function rowToAppointment(r: AppointmentRow): Appointment {
  return {
    id: r.id,
    businessId: r.business_id,
    clientId: r.client_id,
    petId: r.pet_id,
    serviceId: r.service_id ?? "",
    start: r.start_at,
    status: r.status,
    source: r.source,
    notes: r.notes ?? "",
    priceGBP: num(r.price_gbp),
    coatCondition: r.coat_condition,
    durationMin: r.duration_min,
    deposit: r.deposit == null ? undefined : num(r.deposit),
    depositStatus: (r.deposit_status as Appointment["depositStatus"]) ?? undefined,
    depositPaymentIntentId: r.deposit_payment_intent_id ?? undefined,
    reminderSentAt: r.reminder_sent_at ?? undefined,
    report: r.report ?? undefined,
    declarations: Array.isArray(r.declarations) ? r.declarations : undefined,
    termsText: r.terms_text ?? undefined,
    termsSignedName: r.terms_signed_name ?? undefined,
    termsAcceptedAt: r.terms_accepted_at ?? undefined,
    mattingLevel: r.matting_level ?? undefined,
    temperamentLevel: r.temperament_level ?? undefined,
    addons: Array.isArray(r.addons) ? r.addons : undefined,
    depositLinkToken: r.deposit_link_token ?? undefined,
    depositLinkExpiresAt: r.deposit_link_expires_at ?? undefined,
  };
}

/** All appointments for a business, ordered by start time. */
export async function fetchAppointments(businessId: string): Promise<Appointment[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("business_id", businessId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return (data as AppointmentRow[]).map(rowToAppointment);
}

/** Postgres exclusion_violation — an overlapping (clashing) booking. */
export function isClashError(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "23P01";
}

/**
 * Insert an appointment with an explicit id (so the optimistic UI entity and the
 * stored row share an id). The DB's clash/buffer exclusion constraint may reject
 * it with 23P01 — surfaced via isClashError.
 */
export async function insertAppointment(a: Appointment): Promise<Appointment> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      id: a.id,
      business_id: a.businessId,
      client_id: a.clientId,
      pet_id: a.petId,
      service_id: a.serviceId || null,
      start_at: a.start,
      status: a.status,
      source: a.source,
      notes: a.notes,
      price_gbp: a.priceGBP,
      coat_condition: a.coatCondition,
      duration_min: a.durationMin,
      deposit: a.deposit ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToAppointment(data as AppointmentRow);
}

export async function setAppointmentStatusRow(
  id: string,
  status: Appointment["status"],
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function updateAppointmentNotesRow(id: string, notes: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("appointments").update({ notes }).eq("id", id);
  if (error) throw error;
}

/** Move an appointment to a new start (calendar drag). May clash (23P01). */
export async function rescheduleAppointmentRow(id: string, startISO: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("appointments")
    .update({ start_at: startISO })
    .eq("id", id);
  if (error) throw error;
}

export async function attachReportRow(
  id: string,
  report: Appointment["report"],
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("appointments")
    .update({ report, status: "completed" })
    .eq("id", id);
  if (error) throw error;
}

/** Mark a friendly retention reminder as sent for a pet's completed grooms. */
export async function markReminderSentRow(
  businessId: string,
  petId: string,
  whenISO: string,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("appointments")
    .update({ reminder_sent_at: whenISO })
    .eq("business_id", businessId)
    .eq("pet_id", petId)
    .eq("status", "completed");
  if (error) throw error;
}
