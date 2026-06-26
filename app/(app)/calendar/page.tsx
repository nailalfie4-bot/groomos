"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingForm } from "@/components/booking-form";
import { AppointmentSheet } from "@/components/appointment-sheet";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import { findClash } from "@/lib/schedule";
import type { Appointment, AppointmentStatus } from "@/lib/types";
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

const HOUR_PX = 58;
const MIN_PX = 28;

/**
 * Warm "marker on the board" colour-coding — blush palette, no green. The
 * left edge reads like a little magnet strip; the dot like a marker dot.
 */
const MARKER: Record<AppointmentStatus, { edge: string; label: string }> = {
  confirmed: { edge: "bg-accent", label: "Confirmed" },
  pending: { edge: "bg-warning", label: "Pending" },
  completed: { edge: "bg-border-strong", label: "Done" },
  "no-show": { edge: "bg-danger", label: "No-show" },
  cancelled: { edge: "bg-border-strong", label: "Cancelled" },
};
const LEGEND: AppointmentStatus[] = ["confirmed", "pending", "completed", "no-show"];

function hourLabel(h: number): string {
  const n = h > 12 ? h - 12 : h;
  return String(n);
}

/** Pack overlapping appointments into side-by-side columns (per cluster). */
function packColumns(items: Appointment[]): Record<string, { col: number; cols: number }> {
  const out: Record<string, { col: number; cols: number }> = {};
  const sorted = [...items].sort((a, b) => (a.start < b.start ? -1 : 1));
  const ms = (a: Appointment) => new Date(a.start).getTime();
  const end = (a: Appointment) => ms(a) + a.durationMin * 60_000;
  let i = 0;
  while (i < sorted.length) {
    const cluster = [sorted[i]];
    let clusterEnd = end(sorted[i]);
    let j = i + 1;
    while (j < sorted.length && ms(sorted[j]) < clusterEnd) {
      cluster.push(sorted[j]);
      clusterEnd = Math.max(clusterEnd, end(sorted[j]));
      j++;
    }
    const colEnds: number[] = [];
    for (const a of cluster) {
      let c = colEnds.findIndex((e) => e <= ms(a));
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(end(a));
      } else {
        colEnds[c] = end(a);
      }
      out[a.id] = { col: c, cols: 0 };
    }
    for (const a of cluster) out[a.id].cols = colEnds.length;
    i = j;
  }
  return out;
}

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
  const cols = useMemo(() => packColumns(dayAppts), [dayAppts]);

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
    let mins = Math.round((y / HOUR_PX) * 60 / 15) * 15;
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

  const handDate =
    view === "day"
      ? cursor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
      : `Week of ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;

  return (
    <>
      {/* Handwritten heading — like the date scrawled at the top of the board */}
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-hand text-3xl leading-none text-ink">{handDate}</h1>
          {view === "day" && (
            <p className="mt-1.5 text-xs text-ink-muted">
              {dayAppts.length} dog{dayAppts.length === 1 ? "" : "s"} in
              {dayAppts.length > 0 && <> · {formatGBP(dayTotal)}</>}
            </p>
          )}
        </div>
        <Button size="md" onClick={() => setBooking(atHour(cursor, business.openHour))} className="shrink-0">
          <CalendarPlus className="h-4 w-4" />
          New
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

      {loading ? (
        <BoardFrame>
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </BoardFrame>
      ) : view === "day" ? (
        /* ── Day board ── */
        <BoardFrame>
          <div className="flex">
            {/* Time row labels */}
            <div className="w-10 shrink-0 sm:w-12">
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative">
                  <span className="font-hand absolute right-1.5 top-1 text-base font-semibold text-ink-subtle sm:text-lg">
                    {hourLabel(h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Board surface */}
            <div
              ref={timelineRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="relative flex-1 border-l border-DEFAULT"
              style={{ height: hours.length * HOUR_PX }}
            >
              {/* Hour rows — clean even lines, tap an empty one to book */}
              {hours.map((h, i) => (
                <button
                  key={h}
                  onClick={() => setBooking(atHour(cursor, h))}
                  aria-label={`Book ${h}:00`}
                  style={{ top: i * HOUR_PX, height: HOUR_PX }}
                  className="group absolute inset-x-0 border-t border-border-strong/35 text-left first:border-t-0 hover:bg-accent-50/40"
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
                  <span className="-ml-[5px] h-2.5 w-2.5 rounded-full bg-accent shadow-sm ring-2 ring-surface" />
                  <span className="h-px flex-1 bg-accent/45" />
                </div>
              )}

              {/* Appointment notes */}
              {dayAppts.map((a) => {
                const top = (minutesFromOpen(a.start) / 60) * HOUR_PX;
                const height = Math.max((a.durationMin / 60) * HOUR_PX, MIN_PX);
                const place = cols[a.id] ?? { col: 0, cols: 1 };
                const widthPct = 100 / place.cols;
                const m = MARKER[a.status];
                const pet = getPet(a.petId);
                const svc = services.find((x) => x.id === a.serviceId);
                const special = pet?.size === "giant" || a.coatCondition === "matted";
                const done = a.status === "completed";
                const compact = height < 48;
                return (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={() => setDragId(a.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setOpenAppt(a.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setOpenAppt(a.id)}
                    style={{
                      top: top + 2,
                      height: height - 4,
                      left: `calc(${place.col * widthPct}% + 4px)`,
                      width: `calc(${widthPct}% - 8px)`,
                    }}
                    className={cn(
                      "absolute z-10 cursor-pointer overflow-hidden rounded-xl border border-[#f0d9d3] bg-accent-50 pl-3 pr-2 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
                      done && "opacity-70",
                      dragId === a.id && "opacity-50",
                    )}
                  >
                    {/* magnet edge */}
                    <span className={cn("absolute inset-y-1.5 left-1 w-1 rounded-full", m.edge)} />
                    <div className="flex h-full flex-col justify-center">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold leading-tight text-ink">
                        {done ? (
                          <Check className="h-3 w-3 shrink-0 text-ink-subtle" />
                        ) : (
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", m.edge)} />
                        )}
                        {pet?.name}
                        {special && <Heart className="h-3 w-3 shrink-0 text-accent" />}
                      </p>
                      {compact ? (
                        <span className="tabular-nums mt-0.5 truncate text-[10px] text-ink-muted">
                          {formatTime(a.start)}
                        </span>
                      ) : (
                        <span className="tabular-nums mt-1 truncate text-[11px] text-ink-muted">
                          {formatTime(a.start)} · {svc?.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </BoardFrame>
      ) : (
        /* ── Week board ── */
        <BoardFrame>
          <div className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {weekDays.map((day) => {
              const list = appointments
                .filter((a) => isSameDay(a.start, day) && a.status !== "cancelled")
                .sort((a, b) => (a.start < b.start ? -1 : 1));
              const today = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex min-h-[120px] flex-col rounded-xl border p-2",
                    today ? "border-accent/40 bg-accent-50/50" : "border-DEFAULT/70 bg-canvas/40",
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="font-hand text-base font-semibold text-ink-muted">
                        {day.toLocaleDateString("en-GB", { weekday: "short" })}
                      </span>
                      <span className={cn("font-hand text-base font-semibold", today ? "text-accent" : "text-ink")}>
                        {day.getDate()}
                      </span>
                    </div>
                    <button
                      onClick={() => setBooking(atHour(day, business.openHour))}
                      aria-label="Add appointment"
                      className="flex h-5 w-5 items-center justify-center rounded text-ink-subtle hover:bg-surface hover:text-ink"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {list.length === 0 ? (
                      <span className="px-1 py-1 text-[11px] text-ink-subtle">—</span>
                    ) : (
                      list.map((a) => {
                        const m = MARKER[a.status];
                        return (
                          <button
                            key={a.id}
                            onClick={() => setOpenAppt(a.id)}
                            className={cn(
                              "relative overflow-hidden rounded-md border border-[#f0d9d3] bg-surface py-1 pl-2.5 pr-1.5 text-left shadow-xs transition-shadow hover:shadow-sm",
                              a.status === "completed" && "opacity-70",
                            )}
                          >
                            <span className={cn("absolute inset-y-1 left-1 w-0.5 rounded-full", m.edge)} />
                            <span className="tabular-nums block text-[10px] font-medium text-ink-subtle">
                              {formatTime(a.start)}
                            </span>
                            <span className="block truncate text-[13px] font-semibold leading-tight text-ink">
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
        </BoardFrame>
      )}

      {/* Pen tray — the legend, like markers resting on the board's lip */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {LEGEND.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className={cn("h-2.5 w-4 rounded-full shadow-xs", MARKER[s].edge)} />
            {MARKER[s].label}
          </span>
        ))}
        <span className="ml-auto hidden text-[11px] text-ink-subtle sm:inline">
          Tap a slot to book · tap a dog to edit
        </span>
      </div>

      <BookingForm
        open={booking !== null}
        onClose={() => setBooking(null)}
        defaultStart={booking ?? undefined}
      />
      <AppointmentSheet appointmentId={openAppt} onClose={() => setOpenAppt(null)} />
    </>
  );
}

/** The physical whiteboard: a warm frame around a clean white writing surface. */
function BoardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] bg-gradient-to-b from-[#efdfd9] to-[#e0c8c2] p-2 shadow-[0_14px_34px_rgba(74,45,40,0.14)]">
      <div className="overflow-hidden rounded-2xl bg-surface shadow-[inset_0_1px_3px_rgba(74,45,40,0.06)]">
        {children}
      </div>
    </div>
  );
}
