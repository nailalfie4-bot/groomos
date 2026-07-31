/**
 * Time off + closed-day availability — pure, no I/O, shared by the server
 * (public booking enforcement) and the client (calendar + staff booking grid),
 * so both agree on exactly what's unavailable.
 *
 * Timezone note: the public booking page works in UTC wall-clock (a slot for a
 * date is generated as `${date}T{HH:MM}:00Z`). All-day blocks are therefore
 * stored spanning the UTC day and closed weekdays are judged on the UTC date, so
 * whole-day blocking is timezone-robust. Timed blocks use instant overlap (the
 * same basis as appointments).
 */
import type { Appointment, TimeOff } from "@/lib/types";

/** Appointment statuses that still occupy the calendar (a warning should list them). */
const BLOCKING_STATUSES: Appointment["status"][] = ["pending", "confirmed", "completed"];

/** UTC weekday (0 = Sun … 6 = Sat) for a YYYY-MM-DD, judged at noon to dodge DST edges. */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

/** Is the business regularly closed on this date's weekday? */
export function isWeekdayClosed(dateStr: string, closedWeekdays?: number[] | null): boolean {
  return Array.isArray(closedWeekdays) && closedWeekdays.includes(weekdayOf(dateStr));
}

/** Do the half-open ranges [aStart,aEnd) and [bStart,bEnd) overlap? (ms) */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Which time-off blocks close the PUBLIC booking page. A business-wide block (no
 * groomer) always applies. A groomer-specific block only shuts public
 * availability when the business is effectively solo (0–1 groomers) — with a
 * real team the other groomers still cover, so one groomer's day off doesn't
 * close the page.
 */
export function publicBlockingTimeOff(timeOff: TimeOff[], groomerCount: number): TimeOff[] {
  return timeOff.filter((t) => !t.groomerId || groomerCount <= 1);
}

/** Is the [startMs,endMs) slot inside any of these time-off blocks? */
export function slotHitsTimeOff(startMs: number, endMs: number, blocks: TimeOff[]): boolean {
  for (const b of blocks) {
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    if (Number.isFinite(bs) && Number.isFinite(be) && rangesOverlap(startMs, endMs, bs, be)) {
      return true;
    }
  }
  return false;
}

/**
 * The single answer both booking paths ask: is a groom of this slot blocked by a
 * regular closed day or a time-off block? `blocks` should already be filtered to
 * the ones that apply (see publicBlockingTimeOff for the public page).
 */
export function slotUnavailable(opts: {
  dateStr: string;
  startMs: number;
  endMs: number;
  closedWeekdays?: number[] | null;
  blocks: TimeOff[];
}): boolean {
  if (isWeekdayClosed(opts.dateStr, opts.closedWeekdays)) return true;
  return slotHitsTimeOff(opts.startMs, opts.endMs, opts.blocks);
}

/**
 * Existing bookings that fall inside a proposed time-off block — for the "you
 * already have bookings then" warning. NEVER deletes anything; the caller just
 * shows the list and lets the groomer keep the bookings. Filtered to the block's
 * groomer when it's groomer-specific.
 */
export function appointmentsInBlock(
  appointments: Appointment[],
  block: { start: string; end: string; groomerId?: string | null },
): Appointment[] {
  const bs = new Date(block.start).getTime();
  const be = new Date(block.end).getTime();
  if (!Number.isFinite(bs) || !Number.isFinite(be)) return [];
  return appointments.filter((a) => {
    if (!BLOCKING_STATUSES.includes(a.status)) return false;
    if (block.groomerId && a.groomerId !== block.groomerId) return false;
    const as = new Date(a.start).getTime();
    const ae = as + a.durationMin * 60_000;
    return rangesOverlap(as, ae, bs, be);
  });
}

/** Build the stored instants for a block from the form fields (all-day → UTC day bounds). */
export function timeOffInstants(input: {
  allDay: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // HH:MM (timed only)
  endTime?: string; // HH:MM (timed only)
}): { start: string; end: string } {
  if (input.allDay) {
    return {
      start: `${input.startDate}T00:00:00.000Z`,
      end: `${input.endDate}T23:59:59.999Z`,
    };
  }
  // Timed: interpret the picked wall-clock as UTC, matching how public slots are
  // generated, so a timed block lines up with the slots it should remove.
  return {
    start: `${input.startDate}T${input.startTime ?? "00:00"}:00.000Z`,
    end: `${input.endDate}T${input.endTime ?? "23:59"}:00.000Z`,
  };
}
