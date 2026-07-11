import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TIMES = ["9:00", "9:30", "10:00", "1:30", "2:00", "2:30"] as const;
const SELECTED = "1:30";

/**
 * A single, static frame of the client booking widget — the "choose a free
 * time" step — shown in the hero.
 *
 * Deliberately NOT animated: no timers, no cycling, no transitions, nothing
 * that changes by itself. It is a picture of the product, not a movie. Plain
 * styled HTML with its dimensions reserved up front, so it paints in one pass
 * (server-rendered) with zero layout shift and no flash on load.
 */
export function BookingWalkthrough() {
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="rounded-[26px] border border-DEFAULT bg-surface p-4 shadow-xl ring-1 ring-border/60">
        {/* App bar */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-700">
              P
            </span>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-ink">Paws &amp; Co.</p>
              <p className="text-[10px] leading-tight text-ink-subtle">Online booking</p>
            </div>
          </div>
          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium text-ink-muted">
            Tue 1 Jul
          </span>
        </div>

        {/* Screen — one static frame; height is reserved so nothing shifts. */}
        <div className="min-h-[150px] rounded-xl bg-canvas/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-ink-subtle">Free times</p>
            <p className="text-[10px] font-medium text-accent-700">6 free</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TIMES.map((t) => (
              <span
                key={t}
                className={cn(
                  "tabular-nums rounded-lg border px-1 py-2 text-center text-sm font-medium",
                  t === SELECTED
                    ? "border-accent bg-accent text-ink-inverse shadow-sm"
                    : "border-strong bg-surface text-ink",
                )}
              >
                {t}
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-subtle">
            <Clock className="h-3 w-3 shrink-0" /> Only real openings — no clashes, ever.
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-muted">
        Clients pick a free slot in seconds — no back-and-forth.
      </p>
    </div>
  );
}
