"use client";

/**
 * Mobile-first month calendar for the public booking page. Month view with
 * back/next arrows capped to the business's advance-booking window. Days with no
 * availability (past, beyond the window, closed, fully booked, time off) render
 * visibly unselectable — not just empty. Per-day bookability + the window bounds
 * come from the server (fetchMonth), so the client and server never disagree.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MonthAvailability {
  /** Today (UTC) and the last bookable date — the calendar's nav bounds. */
  today: string;
  windowLastDate: string;
  /** dateStr -> has at least one free slot (only the days of the fetched month). */
  bookable: Record<string, boolean>;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m1: number, d: number) => `${y}-${pad(m1)}-${pad(d)}`; // m1 is 1-based
const monthKey = (y: number, m1: number) => `${y}-${pad(m1)}`;

export function BookingCalendar({
  value,
  onSelect,
  fetchMonth,
  minutes,
}: {
  value: string;
  onSelect: (date: string) => void;
  fetchMonth: (month: string, minutes: number) => Promise<MonthAvailability>;
  minutes: number;
}) {
  const [view, setView] = useState(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { y: +value.slice(0, 4), m: +value.slice(5, 7) };
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1 };
  });
  const [data, setData] = useState<MonthAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const autoPicked = useRef(false);

  const mk = monthKey(view.y, view.m);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMonth(mk, minutes)
      .then((d) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mk, minutes, fetchMonth]);

  // On the FIRST month's data, if the pre-selected date isn't bookable, land the
  // visitor on the first bookable day so they don't start on a dead date.
  useEffect(() => {
    if (!data || autoPicked.current) return;
    autoPicked.current = true;
    if (value && data.bookable[value]) return;
    const first = Object.keys(data.bookable)
      .sort()
      .find((k) => data.bookable[k]);
    if (first) onSelect(first);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const cells = useMemo(() => {
    const daysInMonth = new Date(view.y, view.m, 0).getDate(); // view.m 1-based → day 0 of next
    const firstDow = (new Date(view.y, view.m - 1, 1).getDay() + 6) % 7; // Monday = 0
    const arr: (string | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(ymd(view.y, view.m, d));
    return arr;
  }, [view]);

  const today = data?.today ?? "";
  const windowLast = data?.windowLastDate ?? "";
  const now = new Date();
  const atCurrentMonth =
    view.y < now.getFullYear() || (view.y === now.getFullYear() && view.m <= now.getMonth() + 1);
  const nextY = view.m === 12 ? view.y + 1 : view.y;
  const nextM = view.m === 12 ? 1 : view.m + 1;
  const canPrev = !atCurrentMonth;
  const canNext = windowLast ? ymd(nextY, nextM, 1) <= windowLast : false;

  const goPrev = () =>
    canPrev && setView((v) => (v.m === 1 ? { y: v.y - 1, m: 12 } : { y: v.y, m: v.m - 1 }));
  const goNext = () =>
    canNext && setView((v) => (v.m === 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m: v.m + 1 }));

  const monthLabel = new Date(view.y, view.m - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const anyBookable = data ? Object.values(data.bookable).some(Boolean) : true;
  const monthStart = ymd(view.y, view.m, 1);
  const emptyMsg =
    !loading && data && !anyBookable
      ? windowLast && monthStart > windowLast
        ? "Not open for bookings yet"
        : "Fully booked — try another month"
      : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label="Previous month"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            canPrev ? "border-strong text-ink hover:border-accent" : "border-transparent text-ink-subtle opacity-40",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-base font-semibold text-ink">{monthLabel}</span>
        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          aria-label="Next month"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
            canNext ? "border-strong text-ink hover:border-accent" : "border-transparent text-ink-subtle opacity-40",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-center text-[11px] font-medium text-ink-subtle">
            {w}
          </span>
        ))}
      </div>

      <div className="relative grid grid-cols-7 gap-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-surface/70">
            <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
          </div>
        )}
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} aria-hidden />;
          const day = +d.slice(8, 10);
          const past = !!today && d < today;
          const beyond = !!windowLast && d > windowLast;
          const bookable = !!data?.bookable[d] && !past && !beyond;
          const selected = d === value;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              disabled={!bookable}
              onClick={() => onSelect(d)}
              aria-pressed={selected}
              aria-label={bookable ? d : `${d} unavailable`}
              className={cn(
                "flex h-11 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-colors",
                selected
                  ? "border-accent bg-accent text-ink-inverse"
                  : bookable
                    ? "border-strong bg-surface text-ink hover:border-accent hover:bg-accent-50"
                    : "cursor-not-allowed border-transparent bg-surface-sunken/50 text-ink-subtle/50",
                isToday && !selected && bookable && "ring-1 ring-accent/40",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      {emptyMsg && (
        <p className="mt-3 rounded-xl bg-surface-sunken p-3 text-center text-sm text-ink-muted">{emptyMsg}</p>
      )}
    </div>
  );
}
