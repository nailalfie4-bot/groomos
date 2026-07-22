"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STAGE_TONE, type Stage } from "@/lib/pipeline/types";

/** Coloured stage pill. */
export function StagePill({ stage, className }: { stage: Stage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        STAGE_TONE[stage],
        className,
      )}
    >
      {stage}
    </span>
  );
}

/** Copy text to the clipboard with a toast. */
export async function copyText(text: string, label = "Copied"): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't copy — long-press the text to copy it.");
  }
}

/** "Mon 21 Jul" from a YYYY-MM-DD (parsed as local noon to dodge TZ drift). */
export function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export type DueTone = "over" | "today" | "soon" | "none";

/** How a next-action date reads relative to today (string compare is safe for ISO). */
export function dueMeta(iso: string | null, today: string): { label: string; tone: DueTone } {
  if (!iso) return { label: "No date", tone: "none" };
  if (iso === today) return { label: "Today", tone: "today" };
  const days = Math.round(
    (new Date(`${iso}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) /
      86_400_000,
  );
  if (days < 0) return { label: days === -1 ? "1 day overdue" : `${-days} days overdue`, tone: "over" };
  return { label: fmtDate(iso), tone: "soon" };
}

export const DUE_TONE_CLASS: Record<DueTone, string> = {
  over: "bg-danger-soft text-danger-deep",
  today: "bg-warning-soft text-warning-deep",
  soon: "bg-accent-50 text-accent-700",
  none: "bg-surface-sunken text-ink-subtle",
};
