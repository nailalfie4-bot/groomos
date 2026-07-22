/**
 * Founder Pipeline Tracker — types + constants.
 *
 * Internal, founder-only sales CRM for Instagram outreach to prospective
 * groomers. Not customer-facing. Data lives in Supabase (prospects +
 * outreach_daily), scoped to the founder by RLS.
 */

export const STAGES = [
  "Warm",
  "Opened",
  "Digging",
  "Revealed",
  "Call booked",
  "Trial",
  "Paid",
  "Nurture",
  "Dead",
] as const;
export type Stage = (typeof STAGES)[number];

export const SIGNALS = [
  "Diary",
  "Chaos",
  "Control",
  "Content",
  "New business",
  "Cleaning",
  "Social media",
] as const;
export type Signal = (typeof SIGNALS)[number];

/** Pill tone per stage — cool → warm → won, following the ladder. */
export const STAGE_TONE: Record<Stage, string> = {
  Warm: "bg-surface-sunken text-ink-muted",
  Opened: "bg-accent-50 text-accent-700",
  Digging: "bg-accent-100 text-accent-700",
  Revealed: "bg-warning-soft text-warning-deep",
  "Call booked": "bg-warning-soft text-warning-deep",
  Trial: "bg-success-soft text-success-deep",
  Paid: "bg-success text-ink-inverse",
  Nurture: "bg-surface-sunken text-ink-muted",
  Dead: "bg-surface-sunken text-ink-subtle line-through",
};

export interface Prospect {
  id: string;
  handle: string;
  name: string | null;
  area: string;
  stage: Stage;
  signal: Signal | null;
  nextAction: string | null;
  /** YYYY-MM-DD (local), or null. */
  nextActionDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachDay {
  /** YYYY-MM-DD (local). */
  day: string;
  openers: number;
  replies: number;
  callsBooked: number;
  trialsStarted: number;
  paidConversions: number;
}

/** The five funnel counters logged each day, in order. */
export const OUTREACH_METRICS = [
  { key: "openers", label: "Openers" },
  { key: "replies", label: "Replies" },
  { key: "callsBooked", label: "Calls booked" },
  { key: "trialsStarted", label: "Trials" },
  { key: "paidConversions", label: "Paid" },
] as const;
export type OutreachMetric = (typeof OUTREACH_METRICS)[number]["key"];

export const DAILY_OPENER_TARGET = 20;

export const AREA_DEFAULT = "Gtr Manchester";

/** An empty counter set for a given day. */
export function emptyOutreach(day: string): OutreachDay {
  return { day, openers: 0, replies: 0, callsBooked: 0, trialsStarted: 0, paidConversions: 0 };
}
