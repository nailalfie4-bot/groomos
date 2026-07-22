"use client";

import { useMemo } from "react";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { STAGES, type Prospect, type Stage } from "@/lib/pipeline/types";
import type { PipelineApi } from "@/lib/pipeline/use-pipeline";
import { DUE_TONE_CLASS, dueMeta, StagePill } from "./bits";

export function PipelineTab({
  api,
  today,
  onEdit,
  onAdd,
}: {
  api: PipelineApi;
  today: string;
  onEdit: (p: Prospect) => void;
  onAdd: () => void;
}) {
  const groups = useMemo(() => {
    const byStage = (s: Stage) =>
      api.prospects
        .filter((p) => p.stage === s)
        .sort((a, b) => {
          // Dated first (soonest), then undated, then by handle.
          if (a.nextActionDate && b.nextActionDate) return a.nextActionDate.localeCompare(b.nextActionDate);
          if (a.nextActionDate) return -1;
          if (b.nextActionDate) return 1;
          return a.handle.localeCompare(b.handle);
        });
    return STAGES.map((stage) => ({ stage, items: byStage(stage) }));
  }, [api.prospects]);

  const total = api.prospects.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{total}</span> prospect{total === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={onAdd}>
          <UserPlus className="h-4 w-4" /> Add prospect
        </Button>
      </div>

      {/* Stage counts */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {groups.map(({ stage, items }) => (
          <span
            key={stage}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              items.length ? "border-strong bg-surface text-ink" : "border-DEFAULT bg-surface-sunken text-ink-subtle",
            )}
          >
            {stage}
            <span className={cn("tabular-nums", items.length ? "text-accent-700" : "text-ink-subtle")}>
              {items.length}
            </span>
          </span>
        ))}
      </div>

      {total === 0 ? (
        <p className="rounded-2xl border border-dashed border-strong bg-surface-sunken px-4 py-10 text-center text-sm text-ink-muted">
          No prospects yet. Tap <span className="font-medium text-ink">Add prospect</span> to start your pipeline.
        </p>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map(({ stage, items }) => (
            <section key={stage}>
              <h2 className="mb-2 flex items-center gap-2">
                <StagePill stage={stage} />
                <span className="text-xs font-medium text-ink-muted">{items.length}</span>
              </h2>
              <ul className="flex flex-col gap-2">
                {items.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => onEdit(p)}
                      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-DEFAULT bg-surface p-3.5 text-left shadow-card transition-colors hover:border-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">@{p.handle}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {p.signal && (
                            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                              {p.signal}
                            </span>
                          )}
                          <span className="text-[11px] text-ink-subtle">{p.area}</span>
                        </div>
                        {p.nextAction && <p className="mt-1.5 truncate text-xs text-ink-muted">{p.nextAction}</p>}
                      </div>
                      {p.nextActionDate && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            DUE_TONE_CLASS[dueMeta(p.nextActionDate, today).tone],
                          )}
                        >
                          {dueMeta(p.nextActionDate, today).label}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
