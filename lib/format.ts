/** Formatting helpers — GBP currency, dates, times, and small string utils. */

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatGBP(amount: number): string {
  return gbp.format(amount);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function initials(first: string, last = ""): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** True when two ISO datetimes fall on the same calendar day. */
export function isSameDay(a: string | Date, b: string | Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Add days to a date and return a new Date (does not mutate). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Monday-based start of the week containing `date`, at 00:00. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setHours(0, 0, 0, 0);
  return addDays(d, -day);
}

/** ISO datetime for a given day at a decimal hour (e.g. 9.5 = 09:30). */
export function atHour(day: Date, decimalHour: number): string {
  const d = new Date(day);
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function endOfAppointment(startIso: string, durationMin: number): Date {
  return new Date(new Date(startIso).getTime() + durationMin * 60_000);
}
