/**
 * The five real prospects pre-loaded so /pipeline isn't empty on first use.
 *
 * In demo mode these render straight from memory. In the live app, if the
 * founder's prospects table is empty on first load, these are inserted once
 * (owner defaults to the signed-in founder via RLS). Stage/signal/notes are as
 * briefed; next actions + dates are sensible starting points to edit.
 */
import { AREA_DEFAULT, type Signal, type Stage } from "./types";

export type ProspectSeed = {
  handle: string;
  name: string | null;
  area: string;
  stage: Stage;
  signal: Signal | null;
  nextAction: string | null;
  /** Offset in days from "today", or an absolute YYYY-MM-DD, or null. */
  nextActionOffsetDays?: number;
  nextActionDateAbsolute?: string;
  notes: string;
};

export const PROSPECT_SEEDS: ProspectSeed[] = [
  {
    handle: "buddys.bubbles",
    name: null,
    area: AREA_DEFAULT,
    stage: "Revealed",
    signal: "Diary",
    nextAction: "Send the close",
    nextActionOffsetDays: 0,
    notes: "Writes bookings in a diary and goes through messages manually. Hottest lead.",
  },
  {
    handle: "bettys.doggrooming",
    name: null,
    area: AREA_DEFAULT,
    stage: "Digging",
    signal: "Control",
    nextAction: "Ask the control dig question",
    nextActionOffsetDays: 0,
    notes: "Open 2 months, manages bookings herself, wants control of which dogs/coats/behaviour she takes.",
  },
  {
    handle: "snootydoggyluxurygroomers",
    name: null,
    area: AREA_DEFAULT,
    stage: "Digging",
    signal: "Control",
    nextAction: "Follow up — control of timing",
    nextActionOffsetDays: 2,
    notes: "Does bookings herself, likes control of timing.",
  },
  {
    handle: "dorsett_dogs",
    name: null,
    area: AREA_DEFAULT,
    stage: "Digging",
    signal: "New business",
    nextAction: "Reveal — cleaning time-saver angle",
    nextActionOffsetDays: 1,
    notes: "Solo, still building client base, cleaning is biggest time sink.",
  },
  {
    handle: "trimsdoggrooming",
    name: null,
    area: AREA_DEFAULT,
    stage: "Nurture",
    signal: "New business",
    nextAction: "Offer free pre-launch setup",
    nextActionDateAbsolute: "2026-08-01",
    notes: "Opening August, already said she has the app in mind. Offer free pre-launch setup.",
  },
];
