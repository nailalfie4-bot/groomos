"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, ChevronLeft, ChevronRight, Heart, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingForm } from "@/components/booking-form";
import { AppointmentSheet } from "@/components/appointment-sheet";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import { findClash } from "@/lib/schedule";
import {
  LEGEND_STATUSES,
  STATUS_LABEL,
  STATUS_STYLE,
} from "@/lib/appointment-ui";
import {
  addDays,
  atHour,
  formatGBP,
  formatTime,
  isSameDay,
  startOfWeek,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type View = "day" | "week";

const HOUR_PX = 76;

export default function CalendarPage() {
  const loading = useDemoLoad();
  const {
    appointments,
    business,
    settings,
    getPet,
    services,
    rescheduleAppointment,
  } = useStore();
  const [view, setView] = useState<View>("day");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [booking, setBooking] = useState<string | null>(null);
  const [openAppt, setOpenAppt] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = business.openHour; h < business.closeHour; h++) out.push(h);
    return out;
  }, [business.openHour, business.closeHour]);

  const dayAppts = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(a.start, cursor) && a.status !== "cancelled")
        .sort((a, b) => (a.start < b.start ? -1 : 1)),
    [appointments, cursor],
  );

  const dayTotal = dayAppts
    .filter((a) => a.status !== "no-show")
    .reduce((sum, a) => sum + a.priceGBP, 0);

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const isToday = isSameDay(cursor, new Date());
  const nowMins = (() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes() - business.openHour * 60;
  })();
  const dayLen = (business.closeHour - business.openHour) * 60;

  function shift(dir: -1 | 1) {
    setCursor((c) => addDays(c, view === "day" ? dir : dir * 7));
  }

  function minutesFromOpen(iso: string): number {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes() - business.openHour * 60;
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const id = dragId;
    setDragId(null);
    if (!id || !timelineRef.current) return;
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let mins = (Math.round((y / HOUR_PX) * 60 / 15) * 15); // snap 15 min
    mins = Math.max(0, Math.min(mins, dayLen - appt.durationMin));
    const start = atHour(cursor, business.openHour + mins / 60);
    if (start === appt.start) return;
    const clash = findClash(appointments, settings, start, appt.durationMin, id);
    if (clash) {
      toast.error("That clashes with another dog", {
        description: "There isn't room (incl. cleanup time). Try another slot.",
      });
      return;
    }
    rescheduleAppointment(id, start);
    toast.success(`Moved to ${formatTime(start)}`);
  }

  return (
    <>
      {/* Header */}
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            Calendar
          </h1>
          <p className="text-sm text-ink-muted">
            {view === "day"
              ? cursor.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : `Week of ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
            {view === "day" && dayAppts.length > 0 && (
              <span className="text-ink-subtle">
                {" "}
                · {dayAppts.length} dog{dayAppts.length === 1 ? "" : "s"} · {formatGBP(dayTotal)}
              </span>
            )}
          </p>
        </div>
        <Button size="md" onClick={() => setBooking(atHour(cursor, business.openHour))} className="w-full sm:w-auto">
          <CalendarPlus className="h-4 w-4" />
          New booking
        </Button>
      </header>

      {/* Controls */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shift(1)} aria-label="Next">
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
                view === v ? "bg-surface-sunken text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {LEGEND_STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[s].bar)} />
            {STATUS_LABEL[s]}
          </span>
        ))}
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
        /* ── Day timeline ── */
        <Card className="overflow-hidden p-0">
          <p className="border-b border-DEFAULT px-4 py-2.5 text-xs text-ink-subtle">
            Tap a free time to book · tap a dog to view or edit
          </p>
          <div className="flex">
            {/* Hour gutter */}
            <div className="w-14 shrink-0">
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative border-b border-DEFAULT/60">
                  <span className="tabular-nums absolute right-2 top-1.5 text-[11px] font-medium text-ink-subtle">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div
              ref={timelineRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="relative flex-1 border-l border-DEFAULT"
              style={{ height: hours.length * HOUR_PX }}
            >
              {/* Clickable empty hour cells */}
              {hours.map((h, i) => (
                <button
                  key={h}
                  onClick={() => setBooking(atHour(cursor, h))}
                  aria-label={`Book ${h}:00`}
                  style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  className="group absolute inset-x-0 border-b border-DEFAULT/60 text-left hover:bg-surface-sunken/40"
                >
                  <span className="ml-2 mt-1.5 inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[11px] text-ink-subtle opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
                    <Plus className="h-3 w-3" /> Book
                  </span>
                </button>
              ))}

              {/* Now line */}
              {isToday && nowMins >= 0 && nowMins <= dayLen && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                  style={{ top: (nowMins / 60) * HOUR_PX }}
                >
                  <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-accent shadow-sm" />
                  <span className="h-px flex-1 bg-accent/50" />
                </div>
              )}

              {/* Appointment blocks + buffers */}
              {dayAppts.map((a) => {
                const top = (minutesFromOpen(a.start) / 60) * HOUR_PX;
                const height = Math.max((a.durationMin / 60) * HOUR_PX, 40);
                const bufferH = (settings.bufferMin / 60) * HOUR_PX;
                const s = STATUS_STYLE[a.status];
                const pet = getPet(a.petId);
                const svc = services.find((x) => x.id === a.serviceId);
                const special = pet?.size === "giant" || a.coatCondition === "matted";
                return (
                  <div key={a.id} className="absolute inset-x-1.5 sm:inset-x-2" style={{ top }}>
                    <div
                      draggable
                      onDragStart={() => setDragId(a.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setOpenAppt(a.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setOpenAppt(a.id)}
                      style={{ height }}
                      className={cn(
                        "relative flex cursor-pointer flex-col justify-center overflow-hidden rounded-xl border border-DEFAULT pl-3.5 pr-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
                        s.block,
                        dragId === a.id && "opacity-50",
                      )}
                    >
                      <span className={cn("absolute inset-y-2 left-2 w-1 rounded-full", s.bar)} />
                      <p className="truncate text-sm font-semibold text-ink">
                        {pet?.name}
                        {special && <Heart className="ml-1 inline h-3 w-3 text-accent" />}
                      </p>
                      <p className="tabular-nums truncate text-xs text-ink-muted">
                        {formatTime(a.start)} · {svc?.name}
                      </p>
                    </div>
                    {/* Cleanup buffer */}
                    <div
                      style={{
                        height: bufferH,
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(138,116,112,0.10) 0 6px, transparent 6px 12px)",
                      }}
                      className="mx-0.5 rounded-b-md"
                      title={`${settings.bufferMin} min cleanup`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      ) : (
        /* ── Week board ── */
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {weekDays.map((day) => {
            const dayList = appointments
              .filter((a) => isSameDay(a.start, day) && a.status !== "cancelled")
              .sort((a, b) => (a.start < b.start ? -1 : 1));
            const today = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex flex-col rounded-xl border bg-surface p-2.5 shadow-card",
                  today ? "border-accent ring-1 ring-accent/20" : "border-DEFAULT",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-ink-subtle">
                      {day.toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <span className={cn("tabular-nums text-sm font-semibold", today ? "text-accent" : "text-ink")}>
                      {day.getDate()}
                    </span>
                  </div>
                  <button
                    onClick={() => setBooking(atHour(day, business.openHour))}
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
                    dayList.map((a) => {
                      const s = STATUS_STYLE[a.status];
                      return (
                        <button
                          key={a.id}
                          onClick={() => setOpenAppt(a.id)}
                          className={cn(
                            "flex flex-col rounded-lg border-l-[3px] px-2 py-1.5 text-left transition-shadow hover:shadow-sm",
                            s.block,
                            s.border,
                          )}
                        >
                          <span className="tabular-nums text-[11px] font-semibold text-ink">
                            {formatTime(a.start)}
                          </span>
                          <span className="truncate text-[11px] text-ink-muted">
                            {getPet(a.petId)?.name}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BookingForm
        open={booking !== null}
        onClose={() => setBooking(null)}
        defaultStart={booking ?? undefined}
      />
      <AppointmentSheet appointmentId={openAppt} onClose={() => setOpenAppt(null)} />
    </>
  );
}
