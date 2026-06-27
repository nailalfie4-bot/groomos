/**
 * Scheduling helpers — keep the calendar honest so a solo groomer can never
 * double-book themselves. An appointment occupies its duration PLUS the
 * configured cleanup buffer; two appointments clash if those windows overlap.
 */

import type { Appointment, Business, Settings } from "@/lib/types";

/** Statuses that actually occupy a slot (cancelled/no-show free it up). */
const BLOCKING: Appointment["status"][] = ["pending", "confirmed", "completed"];

/** Granularity of the start times offered to clients (clean :00 / :30 chips). */
export const SLOT_STEP_MIN = 30;

function windowFor(a: Appointment, bufferMin: number): [number, number] {
  const start = new Date(a.start).getTime();
  const end = start + (a.durationMin + bufferMin) * 60_000;
  return [start, end];
}

/**
 * Returns the first existing appointment that clashes with a proposed slot,
 * or null if the slot is free. `excludeId` skips the appointment being moved.
 */
export function findClash(
  appointments: Appointment[],
  settings: Settings,
  startIso: string,
  durationMin: number,
  excludeId?: string,
): Appointment | null {
  const start = new Date(startIso).getTime();
  const end = start + (durationMin + settings.bufferMin) * 60_000;
  for (const a of appointments) {
    if (a.id === excludeId) continue;
    if (!BLOCKING.includes(a.status)) continue;
    const [aStart, aEnd] = windowFor(a, settings.bufferMin);
    if (start < aEnd && aStart < end) return a;
  }
  return null;
}

/**
 * The bookable start times on `day` for a groom lasting `durationMin`, as
 * "HH:MM" 24h strings. A slot is offered only when the whole groom fits inside
 * opening hours and doesn't clash with an existing appointment (including the
 * cleanup buffer on either side), so the client can never create an overlap.
 * Past times are excluded when `day` is today, judged against `now`.
 */
export function availableSlots(
  appointments: Appointment[],
  settings: Settings,
  business: Pick<Business, "openHour" | "closeHour">,
  day: Date,
  durationMin: number,
  now: Date = new Date(),
): string[] {
  if (durationMin <= 0) return [];
  const openMin = business.openHour * 60;
  const closeMin = business.closeHour * 60;
  const nowMs = now.getTime();
  const out: string[] = [];
  // Step across the day; the groom itself must finish by closing time.
  for (let m = openMin; m + durationMin <= closeMin; m += SLOT_STEP_MIN) {
    const start = new Date(day);
    start.setHours(Math.floor(m / 60), m % 60, 0, 0);
    if (start.getTime() <= nowMs) continue; // never offer a past slot
    if (!findClash(appointments, settings, start.toISOString(), durationMin)) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      out.push(`${hh}:${mm}`);
    }
  }
  return out;
}

/** A working-day start time with whether a groom can actually begin there. */
export interface DaySlot {
  /** "HH:MM" 24h start time. */
  time: string;
  /** True when a groom of `durationMin` can start here without clashing. */
  available: boolean;
  /** Why it's unavailable (for a11y/tooltip): taken, in the past, or too late. */
  reason?: "taken" | "past" | "tooLate";
}

/**
 * Every start time across the working day (stepped at SLOT_STEP_MIN), each
 * flagged with whether a groom of `durationMin` can begin there. Unlike
 * availableSlots this keeps the unavailable slots, so a booking grid can show
 * the whole day with taken / past / too-late buttons disabled. Past times are
 * judged against `now`; `excludeId` skips an appointment being rescheduled.
 */
export function daySlots(
  appointments: Appointment[],
  settings: Settings,
  business: Pick<Business, "openHour" | "closeHour">,
  day: Date,
  durationMin: number,
  now: Date = new Date(),
  excludeId?: string,
): DaySlot[] {
  const openMin = business.openHour * 60;
  const closeMin = business.closeHour * 60;
  const nowMs = now.getTime();
  const out: DaySlot[] = [];
  for (let m = openMin; m < closeMin; m += SLOT_STEP_MIN) {
    const start = new Date(day);
    start.setHours(Math.floor(m / 60), m % 60, 0, 0);
    const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(
      m % 60,
    ).padStart(2, "0")}`;
    let reason: DaySlot["reason"];
    if (start.getTime() <= nowMs) reason = "past";
    else if (m + durationMin > closeMin) reason = "tooLate";
    else if (findClash(appointments, settings, start.toISOString(), durationMin, excludeId))
      reason = "taken";
    out.push({ time, available: !reason, reason });
  }
  return out;
}

/**
 * The first day from `from` (inclusive) within `horizonDays` that has at least
 * one available slot for `durationMin`, or null if the book is clear that far
 * out. Used to point a client at the next day they can actually book.
 */
export function nextAvailableDay(
  appointments: Appointment[],
  settings: Settings,
  business: Pick<Business, "openHour" | "closeHour">,
  from: Date,
  durationMin: number,
  horizonDays = 60,
  now: Date = new Date(),
): Date | null {
  for (let i = 0; i < horizonDays; i++) {
    const day = new Date(from);
    day.setDate(day.getDate() + i);
    if (availableSlots(appointments, settings, business, day, durationMin, now).length > 0) {
      return day;
    }
  }
  return null;
}
