"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { PetAvatar } from "@/components/pet-avatar";
import { BusinessLogo } from "@/components/business-logo";
import { StatusBadge } from "@/components/status-badge";
import { BookingForm } from "@/components/booking-form";
import { AppointmentSheet } from "@/components/appointment-sheet";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import { computeMetrics } from "@/lib/metrics";
import { formatGBP, formatTime, isSameDay } from "@/lib/format";

/** Warm, glanceable "how long until the next dog" label. */
function untilLabel(startIso: string, now: Date): string {
  const mins = Math.round((new Date(startIso).getTime() - now.getTime()) / 60000);
  if (mins <= 0) return "Starting now";
  if (mins < 60) return `In ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hrs = `${h} hr${h === 1 ? "" : "s"}`;
  return m === 0 ? `In ${hrs}` : `In ${hrs} ${m} min`;
}

export default function DashboardPage() {
  const {
    appointments,
    services,
    business,
    settings,
    getPet,
    getClient,
    getDueForGroom,
    hydrated,
  } = useStore();
  // Show skeletons through the brief demo delay and until real data has loaded.
  const loading = useDemoLoad() || !hydrated;
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
  const nextPet = nextUp ? getPet(nextUp.petId) : undefined;
  const nextClient = nextUp ? getClient(nextUp.clientId) : undefined;
  const nextService = nextUp
    ? services.find((s) => s.id === nextUp.serviceId)
    : undefined;

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
    return { secured, count: month.length };
  }, [appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Greeting + one clear primary action */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <BusinessLogo
            name={business.name}
            logoUrl={business.logoUrl}
            className="h-11 w-11 text-base"
          />
          <div>
            <p className="text-sm text-ink-muted">{dateLabel}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{greeting}</h1>
          </div>
        </div>
        <Button size="md" onClick={() => setBooking(true)} className="w-full sm:w-auto">
          <CalendarPlus className="h-4 w-4" />
          New booking
        </Button>
      </header>

      {/* HERO — the one thing that matters between dogs: what's next */}
      {loading ? (
        <div className="rounded-3xl border border-DEFAULT bg-surface p-6 shadow-card sm:p-8">
          <Skeleton className="h-3 w-16" />
          <div className="mt-6 flex items-center gap-4 sm:gap-5">
            <Skeleton className="h-14 w-14 rounded-full sm:h-16 sm:w-16" />
            <div className="flex flex-1 flex-col gap-2.5">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      ) : nextUp && nextPet ? (
        <button
          onClick={() => setOpenAppt(nextUp.id)}
          className="group block w-full rounded-3xl border border-accent/20 bg-gradient-to-br from-accent-50 via-surface to-surface p-6 text-left shadow-card transition-shadow duration-300 hover:shadow-md sm:p-8"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Next up
            </span>
            <StatusBadge status={nextUp.status} />
          </div>

          <div className="mt-5 flex items-center gap-4 sm:gap-5">
            <PetAvatar
              petId={nextUp.petId}
              name={nextPet.name}
              className="h-14 w-14 sm:h-16 sm:w-16"
            />
            <div className="min-w-0 flex-1">
              <p className="tabular-nums text-4xl font-semibold leading-none tracking-tight text-ink sm:text-5xl">
                {formatTime(nextUp.start)}
              </p>
              <p className="mt-2 truncate text-lg font-semibold text-ink">
                {nextPet.name}
                {nextService && (
                  <span className="font-normal text-ink-muted"> · {nextService.name}</span>
                )}
              </p>
              {nextClient && (
                <p className="truncate text-sm text-ink-muted">
                  {nextClient.firstName} {nextClient.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-accent/15 pt-4">
            <span className="inline-flex items-center rounded-full bg-accent-100 px-2.5 py-1 text-xs font-medium text-accent-700">
              {untilLabel(nextUp.start, now)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors group-hover:text-accent-600">
              View details
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </button>
      ) : (
        <div className="rounded-3xl border border-DEFAULT bg-surface p-6 shadow-card sm:p-8">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Next up
          </span>
          <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            {todays.length === 0 ? "A clear day" : "You're all caught up"}
          </p>
          <p className="mt-1.5 max-w-md text-sm text-ink-muted">
            {todays.length === 0
              ? "Nothing booked today — enjoy the quiet, or add a dog to the diary."
              : "No more dogs left to groom today. Lovely work."}
          </p>
          {todays.length === 0 && (
            <Button size="sm" className="mt-5" onClick={() => setBooking(true)}>
              <CalendarPlus className="h-4 w-4" />
              New booking
            </Button>
          )}
        </div>
      )}

      {/* Secondary stats — one calm row, numbers left to breathe */}
      {loading ? (
        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-4 sm:px-5">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
          <Stat label="Booked today" value={String(active.length)} />
          <Stat label="Expected today" value={formatGBP(expectedToday)} />
          <Stat label="No-show rate" value={`${metrics.noShowRatePct}%`} />
        </div>
      )}

      {/* Quiet notices — only when there's something to know */}
      {!loading && due.length > 0 && (
        <Link
          href="/retention"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-DEFAULT bg-surface px-4 py-3.5 shadow-card transition-colors duration-fast hover:bg-surface-sunken sm:px-5"
        >
          <p className="min-w-0 truncate text-sm text-ink">
            <span className="font-medium">
              {due.length} dog{due.length === 1 ? "" : "s"} due for a groom
            </span>
            <span className="text-ink-muted"> · {formatGBP(incomeAtRisk)} of repeat income</span>
          </p>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle" />
        </Link>
      )}

      {!loading && settings.depositEnabled && protection.secured > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-accent/15 bg-accent-50/60 px-4 py-3.5 sm:px-5">
          <p className="min-w-0 truncate text-sm text-ink">
            <span className="font-medium tabular-nums">{formatGBP(protection.secured)}</span>
            <span className="text-ink-muted"> protected by deposits this month</span>
          </p>
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
        </div>
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
                      className={
                        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-fast sm:gap-4 sm:px-5 " +
                        (isNext
                          ? "bg-accent-50/50 hover:bg-accent-50"
                          : "hover:bg-surface-sunken")
                      }
                    >
                      <span className="tabular-nums w-12 shrink-0 text-sm font-semibold text-ink">
                        {formatTime(a.start)}
                      </span>
                      <PetAvatar petId={a.petId} name={pet?.name ?? ""} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-ink">
                          {pet?.name}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="tabular-nums text-xl font-semibold tracking-tight text-ink sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
