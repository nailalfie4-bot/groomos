/**
 * Shared visual language for appointment status — kept in one place so the
 * dashboard, calendar and detail sheet read identically (a calm, colour-coded
 * "salon whiteboard").
 */
import type { AppointmentStatus } from "@/lib/types";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  "no-show": "No-show",
  cancelled: "Cancelled",
};

export interface StatusStyle {
  /** Soft block fill for calendar/cards. */
  block: string;
  /** Solid left accent bar / status dot. */
  bar: string;
  /** Left-border colour (literal, so Tailwind generates it). */
  border: string;
  /** Readable text-on-tint colour. */
  text: string;
  /** Tone for the design-system Badge. */
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
}

export const STATUS_STYLE: Record<AppointmentStatus, StatusStyle> = {
  confirmed: { block: "bg-success-soft", bar: "bg-success", border: "border-success", text: "text-success-deep", tone: "success" },
  pending: { block: "bg-warning-soft", bar: "bg-warning", border: "border-warning", text: "text-warning-deep", tone: "warning" },
  completed: { block: "bg-accent-50", bar: "bg-accent", border: "border-accent", text: "text-accent-700", tone: "accent" },
  "no-show": { block: "bg-danger-soft", bar: "bg-danger", border: "border-danger", text: "text-danger-deep", tone: "danger" },
  cancelled: { block: "bg-surface-sunken", bar: "bg-border-strong", border: "border-strong", text: "text-ink-muted", tone: "neutral" },
};

/** Statuses shown in the calendar legend, in reading order. */
export const LEGEND_STATUSES: AppointmentStatus[] = [
  "confirmed",
  "pending",
  "completed",
  "no-show",
];
