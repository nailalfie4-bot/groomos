/** Dashboard metrics derived purely from the mock appointment book. */

import type { Appointment, Business, Service } from "@/lib/types";
import { isSameDay } from "@/lib/format";

const ACTIVE_TODAY: Appointment["status"][] = ["pending", "confirmed", "completed"];

export interface DashboardMetrics {
  todayCount: number;
  monthBookings: number;
  monthRevenueGBP: number;
  noShowRatePct: number;
  utilisationPct: number;
}

export function computeMetrics(
  appointments: Appointment[],
  services: Service[],
  business: Business,
  now: Date = new Date(),
): DashboardMetrics {
  const serviceById = new Map(services.map((s) => [s.id, s]));

  const todays = appointments.filter(
    (a) => isSameDay(a.start, now) && a.status !== "cancelled",
  );

  const thisMonth = appointments.filter((a) => {
    const d = new Date(a.start);
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });

  // Revenue counts money actually earned: completed visits this month.
  const monthRevenueGBP = thisMonth
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + a.priceGBP, 0);

  // No-show rate over appointments that have already happened this month.
  const concluded = thisMonth.filter(
    (a) => a.status === "completed" || a.status === "no-show",
  );
  const noShows = concluded.filter((a) => a.status === "no-show").length;
  const noShowRatePct =
    concluded.length === 0
      ? 0
      : Math.round((noShows / concluded.length) * 100);

  // Utilisation: booked minutes today vs total chair-minutes available.
  const bookedMinutesToday = todays
    .filter((a) => ACTIVE_TODAY.includes(a.status))
    .reduce(
      (sum, a) =>
        sum + (a.durationMin || serviceById.get(a.serviceId)?.durationMin || 0),
      0,
    );
  const capacityMinutes =
    (business.closeHour - business.openHour) * 60 * business.stations;
  const utilisationPct =
    capacityMinutes === 0
      ? 0
      : Math.min(100, Math.round((bookedMinutesToday / capacityMinutes) * 100));

  return {
    todayCount: todays.length,
    monthBookings: thisMonth.filter((a) => a.status !== "cancelled").length,
    monthRevenueGBP,
    noShowRatePct,
    utilisationPct,
  };
}

/** Format a signed percentage delta for the Stat component (demo values). */
export function signed(n: number): string {
  return `${n >= 0 ? "+" : ""}${n}%`;
}
