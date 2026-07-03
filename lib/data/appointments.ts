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
  reminder_sent_at: string | null;
  report: Appointment["report"] | null;
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
    reminderSentAt: r.reminder_sent_at ?? undefined,
    report: r.report ?? undefined,
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
