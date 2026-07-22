"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { OUTREACH_METRICS, STAGES, type Stage } from "@/lib/pipeline/types";
import type { PipelineApi } from "@/lib/pipeline/use-pipeline";

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Bar tint per stage — cool early, warm late, green won. */
const STAGE_BAR: Record<Stage, string> = {
  Warm: "bg-border-strong",
  Opened: "bg-accent-300",
  Digging: "bg-accent-400",
  Revealed: "bg-warning",
  "Call booked": "bg-warning",
  Trial: "bg-success/70",
  Paid: "bg-success",
  Nurture: "bg-accent-200",
  Dead: "bg-border",
};

export function NumbersTab({ api, today }: { api: PipelineApi; today: string }) {
  // Last 7 days (incl. today).
  const totals = useMemo(() => {
    const days: string[] = [];
    const base = new Date(`${today}T12:00:00`);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      days.push(isoDate(d));
    }
    const acc = { openers: 0, replies: 0, callsBooked: 0, trialsStarted: 0, paidConversions: 0 };
    for (const day of days) {
      const o = api.getOutreach(day);
      acc.openers += o.openers;
      acc.replies += o.replies;
      acc.callsBooked += o.callsBooked;
      acc.trialsStarted += o.trialsStarted;
      acc.paidConversions += o.paidConversions;
    }
    return acc;
  }, [api, today]);

  const funnel = useMemo(() => {
    const counts = STAGES.map((stage) => ({
      stage,
      count: api.prospects.filter((p) => p.stage === stage).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { counts, max };
  }, [api.prospects]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Last 7 days</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {OUTREACH_METRICS.map((m) => (
            <div key={m.key} className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
              <p className="text-xs font-medium text-ink-muted">{m.label}</p>
              <p className="tabular-nums mt-1 text-3xl font-semibold leading-none tracking-tight text-ink">
                {totals[m.key]}
              </p>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-2xl border border-dashed border-strong bg-surface-sunken p-4">
            <p className="text-xs text-ink-muted">Reply rate</p>
            <p className="tabular-nums mt-1 text-2xl font-semibold text-ink">
              {totals.openers > 0 ? Math.round((totals.replies / totals.openers) * 100) : 0}%
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Funnel · prospects by stage</h2>
        <div className="flex flex-col gap-2 rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
          {funnel.counts.map(({ stage, count }) => (
            <div key={stage} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-medium text-ink-muted">{stage}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-md bg-surface-sunken">
                <div
                  className={cn("flex h-full items-center rounded-md transition-all", STAGE_BAR[stage])}
                  style={{ width: `${Math.max(count === 0 ? 0 : 6, (count / funnel.max) * 100)}%` }}
                />
              </div>
              <span className="tabular-nums w-6 shrink-0 text-right text-sm font-semibold text-ink">{count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
