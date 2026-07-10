"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { caption: "1 · Pick a service" },
  { caption: "2 · Choose a free time" },
  { caption: "3 · Booked in seconds" },
] as const;

/**
 * A self-playing, looping walkthrough of the client booking flow — the modern
 * replacement for a static mock. Cycles service → time → confirmation so a
 * visitor sees how simple booking is, right in the hero.
 */
export function BookingWalkthrough({ paused = false }: { paused?: boolean }) {
  // In `paused` (static) mode we hold on the confirmation screen and run no
  // timer or transitions at all — nothing repaints while the visitor scrolls.
  const [step, setStep] = useState(paused ? 2 : 0);

  useEffect(() => {
    // Static mode: freeze on the confirmation frame, run no timer.
    if (paused) {
      setStep(2);
      return;
    }
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
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
          <span className="text-[10px] font-medium text-accent-700">{STEPS[step].caption}</span>
        </div>

        {/* Screen */}
        <div className="min-h-[192px] rounded-xl bg-canvas/70 p-3">
          {paused ? (
            <div>
              {step === 0 && <ServiceScreen />}
              {step === 1 && <TimeScreen paused />}
              {step === 2 && <ConfirmScreen paused />}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {step === 0 && <ServiceScreen />}
                {step === 1 && <TimeScreen />}
                {step === 2 && <ConfirmScreen />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Progress dots + caption */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full",
              paused ? "" : "transition-all duration-300",
              i === step ? "w-5 bg-accent" : "w-1.5 bg-border-strong",
            )}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">
        How your clients book — in real time.
      </p>
    </div>
  );
}

function ServiceScreen() {
  const services = [
    { n: "Full Groom", d: "90 min · £45", on: true },
    { n: "Bath & Tidy", d: "60 min · £30", on: false },
    { n: "Puppy Intro", d: "45 min · £25", on: false },
  ];
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink-subtle">Choose your groom</p>
      <div className="space-y-2">
        {services.map((s) => (
          <div
            key={s.n}
            className={cn(
              "flex items-center justify-between rounded-xl border px-3 py-2.5",
              s.on ? "border-accent bg-accent-50" : "border-DEFAULT bg-surface",
            )}
          >
            <div>
              <p className="text-sm font-medium text-ink">{s.n}</p>
              <p className="text-[11px] text-ink-subtle">{s.d}</p>
            </div>
            {s.on && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink-inverse">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeScreen({ paused = false }: { paused?: boolean }) {
  const times = ["9:00", "9:30", "10:00", "1:30", "2:00", "2:30"];
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink-subtle">Free times · Tue 1 Jul</p>
      <div className="grid grid-cols-3 gap-2">
        {times.map((t, i) => {
          const className = cn(
            "tabular-nums rounded-lg border px-1 py-2 text-center text-sm font-medium",
            t === "1:30"
              ? "border-accent bg-accent text-ink-inverse shadow-sm"
              : "border-strong bg-surface text-ink",
          );
          return paused ? (
            <span key={t} className={className}>
              {t}
            </span>
          ) : (
            <motion.span
              key={t}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, ease: EASE }}
              className={className}
            >
              {t}
            </motion.span>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-subtle">
        <Clock className="h-3 w-3" /> Only real openings — no clashes, ever.
      </p>
    </div>
  );
}

function ConfirmScreen({ paused = false }: { paused?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 text-center">
      {paused ? (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-deep">
          <Check className="h-7 w-7" />
        </span>
      ) : (
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-deep"
        >
          <Check className="h-7 w-7" />
        </motion.span>
      )}
      <p className="mt-4 text-base font-semibold text-ink">Booking confirmed</p>
      <p className="mt-1 text-sm text-ink-muted">Biscuit · Full Groom</p>
      <p className="text-sm text-ink-muted">Tue 1 Jul · 1:30</p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
        <ShieldCheck className="h-3.5 w-3.5" /> £10 deposit paid
      </span>
    </div>
  );
}
