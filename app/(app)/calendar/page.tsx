"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingForm } from "@/components/booking-form";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import {
  addDays,
  atHour,
  formatDateLong,
  formatTime,
  isSameDay,
  startOfWeek,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type View = "day" | "week";

/** Left-border accent per status, kept consistent with the StatusBadge tones. */
const STATUS_BAR: Record<AppointmentStatus, string> = {
  pending: "border-l-warning",
  confirmed: "border-l-accent",
  completed: "border-l-success",
  "no-show": "border-l-danger",
  cancelled: "border-l-strong",
};

export default function CalendarPage() {
  const loading = useDemoLoad();
  const { appointments, business, getPet, services } = useStore();
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [booking, setBooking] = useState<string | null>(null);

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = business.openHour; h < business.closeHour; h++) out.push(h);
    return out;
  }, [business.openHour, business.closeHour]);

  function apptLabel(a: Appointment): string {
    const pet = getPet(a.petId);
    const svc = services.find((s) => s.id === a.serviceId);
    return `${pet?.name ?? "Pet"} · ${svc?.name ?? ""}`;
  }

  const dayAppts = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(a.start, cursor) && a.status !== "cancelled")
        .sort((a, b) => (a.start < b.start ? -1 : 1)),
    [appointments, cursor],
  );

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  function shift(dir: -1 | 1) {
    setCursor((c) => addDays(c, view === "day" ? dir : dir * 7));
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={
          view === "day"
            ? formatDateLong(cursor.toISOString())
            : `Week of ${formatDateLong(weekStart.toISOString())}`
        }
        actions={
          <Button size="sm" onClick={() => setBooking(atHour(cursor, 9))}>
            <CalendarPlus className="h-4 w-4" />
            New
          </Button>
        }
      />

      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="inline-flex rounded-lg border border-strong bg-surface p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors duration-fast",
                view === v
                  ? "bg-surface-sunken text-ink"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="p-5">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </Card>
      ) : view === "day" ? (
        /* ── Day view ── */
        <Card className="divide-y divide-border overflow-hidden">
          {hours.map((h) => {
            const slotAppts = dayAppts.filter(
              (a) => new Date(a.start).getHours() === h,
            );
            return (
              <div key={h} className="flex min-h-[64px] gap-3 px-4 py-2.5">
                <span className="tabular-nums w-12 shrink-0 pt-1.5 text-xs text-ink-subtle">
                  {String(h).padStart(2, "0")}:00
                </span>
                <div className="flex flex-1 flex-col gap-2">
                  {slotAppts.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "rounded-lg border border-DEFAULT border-l-2 bg-surface px-3 py-2 shadow-xs",
                        STATUS_BAR[a.status],
                      )}
                    >
                      <p className="text-sm font-medium text-ink">
                        {formatTime(a.start)} · {apptLabel(a)}
                      </p>
                    </div>
                  ))}
                  {/* Click empty space in this hour to book it. */}
                  <button
                    onClick={() => setBooking(atHour(cursor, h))}
                    className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-left text-xs text-ink-subtle opacity-0 transition-opacity duration-fast hover:opacity-100 focus:opacity-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Book {String(h).padStart(2, "0")}:00
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        /* ── Week view ── */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {weekDays.map((day) => {
            const dayList = appointments
              .filter((a) => isSameDay(a.start, day) && a.status !== "cancelled")
              .sort((a, b) => (a.start < b.start ? -1 : 1));
            const today = isSameDay(day, new Date());
            return (
              <Card key={day.toISOString()} className="flex flex-col p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-ink-subtle">
                      {day.toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums text-sm font-semibold",
                        today ? "text-accent" : "text-ink",
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <button
                    onClick={() => setBooking(atHour(day, 9))}
                    aria-label="Add appointment"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-ink"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayList.length === 0 ? (
                    <span className="px-1 py-2 text-xs text-ink-subtle">—</span>
                  ) : (
                    dayList.map((a) => (
                      <div
                        key={a.id}
                        className={cn(
                          "rounded-md border-l-2 bg-surface-sunken px-2 py-1.5",
                          STATUS_BAR[a.status],
                        )}
                      >
                        <p className="tabular-nums text-[11px] font-medium text-ink">
                          {formatTime(a.start)}
                        </p>
                        <p className="truncate text-[11px] text-ink-muted">
                          {getPet(a.petId)?.name}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BookingForm
        open={booking !== null}
        onClose={() => setBooking(null)}
        defaultStart={booking ?? undefined}
      />
    </>
  );
}
