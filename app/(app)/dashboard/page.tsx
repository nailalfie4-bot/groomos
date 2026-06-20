"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, PawPrint } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { BookingForm } from "@/components/booking-form";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import { computeMetrics } from "@/lib/metrics";
import { formatGBP, formatTime, initials, isSameDay } from "@/lib/format";

export default function DashboardPage() {
  const loading = useDemoLoad();
  const { appointments, services, business, getPet, getClient } = useStore();
  const [booking, setBooking] = useState(false);

  const metrics = useMemo(
    () => computeMetrics(appointments, services, business),
    [appointments, services, business],
  );

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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
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
          </>
        )}
      </div>

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
              icon={<PawPrint />}
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
