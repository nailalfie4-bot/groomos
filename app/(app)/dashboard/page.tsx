"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  CircleDollarSign,
  HeartHandshake,
  PawPrint,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { PetAvatar } from "@/components/pet-avatar";
import { StatusBadge } from "@/components/status-badge";
import { BookingForm } from "@/components/booking-form";
import { AppointmentSheet } from "@/components/appointment-sheet";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import { computeMetrics } from "@/lib/metrics";
import { formatGBP, formatTime, isSameDay } from "@/lib/format";

export default function DashboardPage() {
  const loading = useDemoLoad();
  const { appointments, services, business, settings, getPet, getClient, getDueForGroom } =
    useStore();
  const [booking, setBooking] = useState(false);
  const [openAppt, setOpenAppt] = useState<string | null>(null);

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const metrics = useMemo(
    () => computeMetrics(appointments, services, business),
    [appointments, services, business],
  );

  const todays = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(a.start, now) && a.status !== "cancelled")
        .sort((a, b) => (a.start < b.start ? -1 : 1)),
    [appointments], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const active = todays.filter((a) => a.status !== "no-show");
  const expectedToday = active.reduce((sum, a) => sum + a.priceGBP, 0);
  const nextUp = todays.find(
    (a) =>
      new Date(a.start).getTime() >= now.getTime() &&
      (a.status === "pending" || a.status === "confirmed"),
  );

  const due = getDueForGroom();
  const incomeAtRisk = due.reduce((sum, d) => sum + d.lastPriceGBP, 0);

  // No-show protection: deposits securing this month's book.
  const protection = useMemo(() => {
    const month = appointments.filter((a) => {
      const d = new Date(a.start);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        a.status !== "cancelled" &&
        a.deposit
      );
    });
    const secured = month.reduce((sum, a) => sum + (a.deposit ?? 0), 0);
    const noShows = month.filter((a) => a.status === "no-show");
    const kept = noShows.reduce((sum, a) => sum + (a.deposit ?? 0), 0);
    return { secured, count: month.length, noShowCount: noShows.length, kept };
  }, [appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Greeting + one clear primary action */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">{dateLabel}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">
            {greeting}
          </h1>
        </div>
        <Button size="md" onClick={() => setBooking(true)} className="w-full sm:w-auto">
          <CalendarPlus className="h-4 w-4" />
          New booking
        </Button>
      </header>

      {/* Glanceable stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card sm:p-5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-4 h-7 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              icon={<PawPrint className="h-4 w-4" />}
              label="Booked today"
              value={String(active.length)}
              sub={active.length === 0 ? "Clear day" : `${active.length} dog${active.length === 1 ? "" : "s"} in`}
            />
            <StatCard
              icon={<CircleDollarSign className="h-4 w-4" />}
              label="Expected today"
              value={formatGBP(expectedToday)}
              sub="From today's book"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="No-show rate"
              value={`${metrics.noShowRatePct}%`}
              sub="This month"
            />
            <StatCard
              accent
              icon={<CalendarClock className="h-4 w-4" />}
              label="Next up"
              value={nextUp ? formatTime(nextUp.start) : "—"}
              sub={
                nextUp
                  ? getPet(nextUp.petId)?.name ?? "Appointment"
                  : "All done for today"
              }
            />
          </>
        )}
      </div>

      {/* No-show protection */}
      {!loading && settings.depositEnabled && protection.secured > 0 && (
        <div className="mt-3 flex items-center gap-4 rounded-2xl border border-accent/20 bg-accent-50 p-4 shadow-card sm:p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-ink-inverse">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-accent-700">Protected by deposits this month</p>
            <p className="tabular-nums text-[26px] font-semibold leading-none text-ink">
              {formatGBP(protection.secured)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {protection.count} booking{protection.count === 1 ? "" : "s"} secured
              {protection.noShowCount > 0
                ? ` · ${protection.noShowCount} no-show${protection.noShowCount === 1 ? "" : "s"} covered — ${formatGBP(protection.kept)} kept, not lost`
                : " · no-shows covered automatically"}
            </p>
          </div>
        </div>
      )}

      {/* Retention nudge */}
      {!loading && due.length > 0 && (
        <Link
          href="/retention"
          className="mt-3 flex items-center gap-4 rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card transition-colors duration-fast hover:bg-surface-sunken sm:p-5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">
              {due.length} dog{due.length === 1 ? "" : "s"} due for a groom
            </p>
            <p className="text-xs text-ink-muted">
              {formatGBP(incomeAtRisk)} of repeat income — send a friendly nudge.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle" />
        </Link>
      )}

      {/* Today's schedule */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Today&apos;s schedule
          </h2>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Open calendar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : todays.length === 0 ? (
            <EmptyState
              art={<DogEmpty />}
              title="Nothing booked today"
              description="Enjoy the quiet — or add a dog to fill a slot."
              action={
                <Button size="sm" onClick={() => setBooking(true)}>
                  <CalendarPlus className="h-4 w-4" />
                  New booking
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {todays.map((a) => {
                const pet = getPet(a.petId);
                const client = getClient(a.clientId);
                const service = services.find((s) => s.id === a.serviceId);
                const isNext = a.id === nextUp?.id;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => setOpenAppt(a.id)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-fast hover:bg-surface-sunken sm:gap-4 sm:px-5"
                    >
                      <span className="tabular-nums w-12 shrink-0 text-sm font-semibold text-ink">
                        {formatTime(a.start)}
                      </span>
                      <PetAvatar petId={a.petId} name={pet?.name ?? ""} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                          {pet?.name}
                          {isNext && (
                            <span className="rounded-full bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700">
                              Next
                            </span>
                          )}
                        </span>
                        <span className="truncate text-xs text-ink-muted">
                          {client?.firstName} {client?.lastName} · {service?.name}
                        </span>
                      </div>
                      <StatusBadge status={a.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <BookingForm open={booking} onClose={() => setBooking(false)} />
      <AppointmentSheet appointmentId={openAppt} onClose={() => setOpenAppt(null)} />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <span
          className={
            accent
              ? "flex h-7 w-7 items-center justify-center rounded-lg bg-accent-100 text-accent-700"
              : "flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted"
          }
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-ink-muted">{label}</span>
      </div>
      <p className="tabular-nums mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {sub && <p className="mt-1.5 truncate text-xs text-ink-subtle">{sub}</p>}
    </div>
  );
}
