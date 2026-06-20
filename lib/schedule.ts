/**
 * Scheduling helpers — keep the calendar honest so a solo groomer can never
 * double-book themselves. An appointment occupies its duration PLUS the
 * configured cleanup buffer; two appointments clash if those windows overlap.
 */

import type { Appointment, Settings } from "@/lib/types";

/** Statuses that actually occupy a slot (cancelled/no-show free it up). */
const BLOCKING: Appointment["status"][] = ["pending", "confirmed", "completed"];

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
