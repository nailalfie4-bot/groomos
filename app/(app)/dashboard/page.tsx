"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, HeartHandshake, PawPrint } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { BookingForm } from "@/components/booking-form";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import { computeMetrics } from "@/lib/metrics";
import { formatGBP, formatTime, initials, isSameDay } from "@/lib/format";

export default function DashboardPage() {
  const loading = useDemoLoad();
  const { appointments, services, business, getPet, getClient, getDueForGroom, pets } =
    useStore();
  const [booking, setBooking] = useState(false);

  const metrics = useMemo(
    () => computeMetrics(appointments, services, business),
    [appointments, services, business],
  );

  // Retention signals.
  const due = getDueForGroom();
  const incomeAtRisk = useMemo(
    () => due.reduce((sum, d) => sum + d.lastPriceGBP, 0),
    [due],
  );
  const rebookingRate = useMemo(() => {
    const now = Date.now();
    const petsWithHistory = pets.filter((p) =>
      appointments.some((a) => a.petId === p.id && a.status === "completed"),
    );
    if (petsWithHistory.length === 0) return 0;
    const withUpcoming = petsWithHistory.filter((p) =>
      appointments.some(
        (a) =>
          a.petId === p.id &&
          new Date(a.start).getTime() >= now &&
          (a.status === "pending" || a.status === "confirmed"),
      ),
    );
    return Math.round((withUpcoming.length / petsWithHistory.length) * 100);
  }, [pets, appointments]);

  const todays = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(a.start, new Date()) && a.status !== "cancelled")
        .sort((a, b) => (a.start < b.start ? -1 : 1)),
    [appointments],
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={business.name}
        actions={
          <Button size="sm" onClick={() => setBooking(true)}>
            <CalendarPlus className="h-4 w-4" />
            New appointment
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-3 h-7 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <Stat label="Today" value={String(metrics.todayCount)} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Stat
                  label="Bookings (mo)"
                  value={String(metrics.monthBookings)}
                  delta="+8%"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Stat
                  label="Revenue (mo)"
                  value={formatGBP(metrics.monthRevenueGBP)}
                  delta="+12%"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Stat
                  label="No-show rate"
                  value={`${metrics.noShowRatePct}%`}
                  delta={metrics.noShowRatePct <= 10 ? "-2%" : "+3%"}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Stat
                  label="Utilisation"
                  value={`${metrics.utilisationPct}%`}
                  delta="+5%"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Stat
                  label="Rebooking rate"
                  value={`${rebookingRate}%`}
                  delta={rebookingRate >= 60 ? "+6%" : "-4%"}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Retention nudge */}
      {!loading && due.length > 0 && (
        <Link
          href="/retention"
          className="mt-4 flex items-center gap-4 rounded-xl border border-DEFAULT bg-surface p-5 shadow-card transition-colors hover:bg-surface-sunken"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
            <HeartHandshake className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">
              {due.length} dog{due.length === 1 ? "" : "s"} due for a groom
            </p>
            <p className="text-xs text-ink-muted">
              {formatGBP(incomeAtRisk)} of repeat income at risk — send a friendly nudge.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle" />
        </Link>
      )}

      {/* Today's schedule */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight text-ink">
            Today&apos;s schedule
          </h2>
          <Link
            href="/calendar"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Open calendar
          </Link>
        </div>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
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
              description="Your day is clear. Add an appointment to fill a slot."
              action={
                <Button size="sm" onClick={() => setBooking(true)}>
                  <CalendarPlus className="h-4 w-4" />
                  New appointment
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {todays.map((a) => {
                const pet = getPet(a.petId);
                const client = getClient(a.clientId);
                const service = services.find((s) => s.id === a.serviceId);
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors duration-fast hover:bg-surface-sunken"
                  >
                    <span className="tabular-nums w-12 shrink-0 text-sm font-medium text-ink">
                      {formatTime(a.start)}
                    </span>
                    <Avatar
                      initials={initials(pet?.name ?? "?")}
                      tone="accent"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-ink">
                        {pet?.name}{" "}
                        <span className="font-normal text-ink-subtle">
                          · {client?.firstName} {client?.lastName}
                        </span>
                      </span>
                      <span className="truncate text-xs text-ink-muted">
                        {service?.name} · {formatGBP(a.priceGBP)}
                      </span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <BookingForm open={booking} onClose={() => setBooking(false)} />
    </>
  );
}
