"use client";

import { useMemo } from "react";
import { CalendarClock, Check, Minus, Plus, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAILY_OPENER_TARGET,
  OUTREACH_METRICS,
  type OutreachMetric,
  type Prospect,
} from "@/lib/pipeline/types";
import type { PipelineApi } from "@/lib/pipeline/use-pipeline";
import { DUE_TONE_CLASS, dueMeta, StagePill } from "./bits";

export function TodayTab({
  api,
  today,
  onEdit,
  onDone,
}: {
  api: PipelineApi;
  today: string;
  onEdit: (p: Prospect) => void;
  onDone: (p: Prospect) => void;
}) {
  const o = api.getOutreach(today);

  const { dueNow, comingUp } = useMemo(() => {
    const active = api.prospects.filter((p) => p.stage !== "Dead" && p.nextActionDate);
    const dueNow = active
      .filter((p) => p.nextActionDate! <= today)
      .sort((a, b) => a.nextActionDate!.localeCompare(b.nextActionDate!));
    const comingUp = active
      .filter((p) => p.nextActionDate! > today)
      .sort((a, b) => a.nextActionDate!.localeCompare(b.nextActionDate!))
      .slice(0, 5);
    return { dueNow, comingUp };
  }, [api.prospects, today]);

  const hitTarget = o.openers >= DAILY_OPENER_TARGET;
  const pct = Math.min(100, Math.round((o.openers / DAILY_OPENER_TARGET) * 100));

  return (
    <div className="flex flex-col gap-5">
      {/* Openers — the daily hero counter with target + progress */}
      <div
        className={cn(
          "rounded-2xl border p-4 shadow-card transition-colors",
          hitTarget ? "border-success/40 bg-success-soft" : "border-DEFAULT bg-surface",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Openers today</p>
            <p className="text-xs text-ink-muted">Target {DAILY_OPENER_TARGET}</p>
          </div>
          {hitTarget && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-ink-inverse">
              <PartyPopper className="h-3.5 w-3.5" /> Target hit!
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <StepButton label="Remove opener" onClick={() => api.bumpMetric(today, "openers", -1)}>
            <Minus className="h-5 w-5" />
          </StepButton>
          <NumberField
            value={o.openers}
            onCommit={(v) => api.setMetric(today, "openers", v)}
            className="text-4xl"
          />
          <StepButton label="Add opener" primary onClick={() => api.bumpMetric(today, "openers", 1)}>
            <Plus className="h-5 w-5" />
          </StepButton>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={cn("h-full rounded-full transition-all", hitTarget ? "bg-success" : "bg-accent")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">
          {hitTarget
            ? "Nice — 20 openers in. Every one is a shot on goal. 🎯"
            : `${DAILY_OPENER_TARGET - o.openers} to go to hit today's target.`}
        </p>
      </div>

      {/* The other four counters */}
      <div className="grid grid-cols-1 gap-2.5">
        {OUTREACH_METRICS.filter((m) => m.key !== "openers").map((m) => (
          <CounterRow
            key={m.key}
            label={m.label}
            value={o[m.key]}
            onBump={(d) => api.bumpMetric(today, m.key as OutreachMetric, d)}
            onSet={(v) => api.setMetric(today, m.key as OutreachMetric, v)}
          />
        ))}
      </div>

      {/* Due now */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarClock className="h-4 w-4 text-accent" /> Due now
          {dueNow.length > 0 && (
            <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">
              {dueNow.length}
            </span>
          )}
        </h2>
        {dueNow.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-strong bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">
            Nothing due. Nice — you&apos;re on top of it. 🙌
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {dueNow.map((p) => (
              <DueCard key={p.id} p={p} today={today} onEdit={() => onEdit(p)} onDone={() => onDone(p)} />
            ))}
          </ul>
        )}
      </section>

      {/* Coming up */}
      {comingUp.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-ink">Coming up</h2>
          <ul className="overflow-hidden rounded-2xl border border-DEFAULT bg-surface">
            {comingUp.map((p) => {
              const due = dueMeta(p.nextActionDate, today);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => onEdit(p)}
                    className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-sunken"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">@{p.handle}</p>
                      <p className="truncate text-xs text-ink-muted">{p.nextAction ?? "Follow up"}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", DUE_TONE_CLASS[due.tone])}>
                      {due.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function DueCard({
  p,
  today,
  onEdit,
  onDone,
}: {
  p: Prospect;
  today: string;
  onEdit: () => void;
  onDone: () => void;
}) {
  const due = dueMeta(p.nextActionDate, today);
  return (
    <li className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
      <button onClick={onEdit} className="block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-ink">@{p.handle}</span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", DUE_TONE_CLASS[due.tone])}>
            {due.label}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StagePill stage={p.stage} />
          {p.signal && (
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {p.signal}
            </span>
          )}
        </div>
        {p.nextAction && <p className="mt-2 text-sm text-ink">{p.nextAction}</p>}
      </button>
      <button
        onClick={onDone}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-strong bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent-50"
      >
        <Check className="h-4 w-4 text-success-deep" /> Done · set next step
      </button>
    </li>
  );
}

function CounterRow({
  label,
  value,
  onBump,
  onSet,
}: {
  label: string;
  value: number;
  onBump: (delta: number) => void;
  onSet: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-DEFAULT bg-surface px-4 py-3 shadow-card">
      <span className="flex-1 text-sm font-medium text-ink">{label}</span>
      <StepButton label={`Remove ${label}`} onClick={() => onBump(-1)}>
        <Minus className="h-4 w-4" />
      </StepButton>
      <NumberField value={value} onCommit={onSet} className="text-xl" />
      <StepButton label={`Add ${label}`} primary onClick={() => onBump(1)}>
        <Plus className="h-4 w-4" />
      </StepButton>
    </div>
  );
}

/** A big thumb-target +/- button. */
function StepButton({
  children,
  onClick,
  label,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-95",
        primary
          ? "border-accent bg-accent text-ink-inverse hover:bg-accent-600"
          : "border-strong bg-surface text-ink hover:bg-surface-sunken",
      )}
    >
      {children}
    </button>
  );
}

/** Tap-to-type number. Selects on focus so you can log 20+ at once. */
function NumberField({
  value,
  onCommit,
  className,
}: {
  value: number;
  onCommit: (value: number) => void;
  className?: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={String(value)}
      onFocusCapture={(e) => e.currentTarget.select()}
      onChange={(e) => onCommit(Number(e.target.value))}
      aria-label="Count — tap to type"
      className={cn(
        "tabular-nums w-16 flex-1 bg-transparent text-center font-semibold text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
    />
  );
}
