"use client";

/**
 * usePipeline — data layer for the founder pipeline tracker.
 *
 * Live (Supabase configured + signed in as the founder): loads prospects +
 * recent outreach, seeds the five starter prospects on an empty first load, and
 * writes optimistically (local state updates instantly, Supabase persists in the
 * background; a failed write reverts and toasts). RLS scopes every row to the
 * founder, so owner_id is set explicitly on write.
 *
 * Demo (no Supabase): the same five prospects live in memory; writes update
 * local state only. Lets the page be built and tested without a login.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PROSPECT_SEEDS, type ProspectSeed } from "./seed";
import {
  emptyOutreach,
  type OutreachDay,
  type OutreachMetric,
  type Prospect,
  type Stage,
} from "./types";

// ── date + id helpers ────────────────────────────────────────────────────────
export function todayISO(): string {
  return isoDate(new Date());
}
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoDate(d);
}
function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

// ── row <-> model mapping ────────────────────────────────────────────────────
type ProspectRow = {
  id: string;
  handle: string;
  name: string | null;
  area: string;
  stage: string;
  signal: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
function rowToProspect(r: ProspectRow): Prospect {
  return {
    id: r.id,
    handle: r.handle,
    name: r.name,
    area: r.area,
    stage: r.stage as Stage,
    signal: (r.signal as Prospect["signal"]) ?? null,
    nextAction: r.next_action,
    nextActionDate: r.next_action_date,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
type OutreachRow = {
  day: string;
  openers: number;
  replies: number;
  calls_booked: number;
  trials_started: number;
  paid_conversions: number;
};
function rowToOutreach(r: OutreachRow): OutreachDay {
  return {
    day: r.day,
    openers: r.openers,
    replies: r.replies,
    callsBooked: r.calls_booked,
    trialsStarted: r.trials_started,
    paidConversions: r.paid_conversions,
  };
}
function outreachToRow(o: OutreachDay, ownerId: string) {
  return {
    owner_id: ownerId,
    day: o.day,
    openers: o.openers,
    replies: o.replies,
    calls_booked: o.callsBooked,
    trials_started: o.trialsStarted,
    paid_conversions: o.paidConversions,
  };
}

function seedDate(s: ProspectSeed): string | null {
  if (s.nextActionDateAbsolute) return s.nextActionDateAbsolute;
  if (typeof s.nextActionOffsetDays === "number") return isoOffset(s.nextActionOffsetDays);
  return null;
}
/** Full Prospect objects from the seeds (for demo + first-run live insert). */
function materializeSeeds(): Prospect[] {
  const now = new Date().toISOString();
  return PROSPECT_SEEDS.map((s) => ({
    id: uuid(),
    handle: s.handle,
    name: s.name,
    area: s.area,
    stage: s.stage,
    signal: s.signal,
    nextAction: s.nextAction,
    nextActionDate: seedDate(s),
    notes: s.notes,
    createdAt: now,
    updatedAt: now,
  }));
}
function prospectToRow(p: Prospect, ownerId: string) {
  return {
    id: p.id,
    owner_id: ownerId,
    handle: p.handle,
    name: p.name,
    area: p.area,
    stage: p.stage,
    signal: p.signal,
    next_action: p.nextAction,
    next_action_date: p.nextActionDate,
    notes: p.notes,
  };
}

// ── public API ───────────────────────────────────────────────────────────────
export type NewProspect = Pick<Prospect, "handle" | "area" | "stage"> &
  Partial<Pick<Prospect, "name" | "signal" | "nextAction" | "nextActionDate" | "notes">>;
export type ProspectPatch = Partial<Omit<Prospect, "id" | "createdAt" | "updatedAt">>;

export interface PipelineApi {
  live: boolean;
  loading: boolean;
  prospects: Prospect[];
  outreach: Record<string, OutreachDay>;
  getOutreach: (day: string) => OutreachDay;
  addProspect: (input: NewProspect) => Prospect;
  updateProspect: (id: string, patch: ProspectPatch) => void;
  deleteProspect: (id: string) => void;
  setMetric: (day: string, metric: OutreachMetric, value: number) => void;
  bumpMetric: (day: string, metric: OutreachMetric, delta: number) => void;
}

export function usePipeline(): PipelineApi {
  const live = isSupabaseConfigured();
  const [prospects, setProspects] = useState<Prospect[]>(() => (live ? [] : materializeSeeds()));
  const [outreach, setOutreach] = useState<Record<string, OutreachDay>>({});
  const [loading, setLoading] = useState(live);
  const ownerRef = useRef<string | null>(null);

  // ── initial load (live) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    (async () => {
      const sb = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      ownerRef.current = user.id;

      const [{ data: pRows }, { data: oRows }] = await Promise.all([
        sb.from("prospects").select("*").order("created_at", { ascending: true }),
        sb.from("outreach_daily").select("*").gte("day", isoOffset(-35)),
      ]);
      if (cancelled) return;

      let list = ((pRows as ProspectRow[] | null) ?? []).map(rowToProspect);
      // Empty on first load → seed the five starters (owned by the founder).
      if (list.length === 0) {
        const seeded = materializeSeeds();
        const { error } = await sb.from("prospects").insert(seeded.map((p) => prospectToRow(p, user.id)));
        if (!error) list = seeded;
      }
      setProspects(list);

      const map: Record<string, OutreachDay> = {};
      for (const r of (oRows as OutreachRow[] | null) ?? []) map[r.day] = rowToOutreach(r);
      setOutreach(map);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [live]);

  const sb = useCallback(() => createSupabaseBrowserClient(), []);

  // ── prospect mutations (optimistic) ──────────────────────────────────────
  const addProspect = useCallback(
    (input: NewProspect): Prospect => {
      const now = new Date().toISOString();
      const p: Prospect = {
        id: uuid(),
        handle: input.handle.trim().replace(/^@/, ""),
        name: input.name?.trim() || null,
        area: input.area.trim() || "Gtr Manchester",
        stage: input.stage,
        signal: input.signal ?? null,
        nextAction: input.nextAction?.trim() || null,
        nextActionDate: input.nextActionDate || null,
        notes: input.notes?.trim() || null,
        createdAt: now,
        updatedAt: now,
      };
      setProspects((prev) => [...prev, p]);
      if (live && ownerRef.current) {
        sb()
          .from("prospects")
          .insert(prospectToRow(p, ownerRef.current))
          .then(({ error }) => {
            if (error) {
              setProspects((prev) => prev.filter((x) => x.id !== p.id));
              toast.error("Couldn't save the prospect — please try again.");
            }
          });
      }
      return p;
    },
    [live, sb],
  );

  const updateProspect = useCallback(
    (id: string, patch: ProspectPatch) => {
      let prevSnapshot: Prospect | undefined;
      setProspects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          prevSnapshot = p;
          return { ...p, ...patch, updatedAt: new Date().toISOString() };
        }),
      );
      if (live && ownerRef.current) {
        const row: Record<string, unknown> = {};
        if ("handle" in patch) row.handle = patch.handle;
        if ("name" in patch) row.name = patch.name;
        if ("area" in patch) row.area = patch.area;
        if ("stage" in patch) row.stage = patch.stage;
        if ("signal" in patch) row.signal = patch.signal;
        if ("nextAction" in patch) row.next_action = patch.nextAction;
        if ("nextActionDate" in patch) row.next_action_date = patch.nextActionDate;
        if ("notes" in patch) row.notes = patch.notes;
        sb()
          .from("prospects")
          .update(row)
          .eq("id", id)
          .then(({ error }) => {
            if (error && prevSnapshot) {
              const restore = prevSnapshot;
              setProspects((prev) => prev.map((p) => (p.id === id ? restore : p)));
              toast.error("Couldn't save your change — please try again.");
            }
          });
      }
    },
    [live, sb],
  );

  const deleteProspect = useCallback(
    (id: string) => {
      let removed: Prospect | undefined;
      setProspects((prev) => {
        removed = prev.find((p) => p.id === id);
        return prev.filter((p) => p.id !== id);
      });
      if (live && ownerRef.current) {
        sb()
          .from("prospects")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error && removed) {
              const back = removed;
              setProspects((prev) => [...prev, back]);
              toast.error("Couldn't delete — please try again.");
            }
          });
      }
    },
    [live, sb],
  );

  // ── outreach counters (optimistic upsert) ────────────────────────────────
  const persistOutreach = useCallback(
    (next: OutreachDay, prev: OutreachDay | undefined) => {
      if (!live || !ownerRef.current) return;
      sb()
        .from("outreach_daily")
        .upsert(outreachToRow(next, ownerRef.current), { onConflict: "owner_id,day" })
        .then(({ error }) => {
          if (error) {
            setOutreach((cur) => ({ ...cur, [next.day]: prev ?? emptyOutreach(next.day) }));
            toast.error("Couldn't save the count — please try again.");
          }
        });
    },
    [live, sb],
  );

  const setMetric = useCallback(
    (day: string, metric: OutreachMetric, value: number) => {
      const v = Math.max(0, Math.round(value) || 0);
      setOutreach((cur) => {
        const prev = cur[day];
        const base = prev ?? emptyOutreach(day);
        const next = { ...base, [metric]: v };
        persistOutreach(next, prev);
        return { ...cur, [day]: next };
      });
    },
    [persistOutreach],
  );

  const bumpMetric = useCallback(
    (day: string, metric: OutreachMetric, delta: number) => {
      setOutreach((cur) => {
        const prev = cur[day];
        const base = prev ?? emptyOutreach(day);
        const next = { ...base, [metric]: Math.max(0, base[metric] + delta) };
        persistOutreach(next, prev);
        return { ...cur, [day]: next };
      });
    },
    [persistOutreach],
  );

  const getOutreach = useCallback(
    (day: string): OutreachDay => outreach[day] ?? emptyOutreach(day),
    [outreach],
  );

  return {
    live,
    loading,
    prospects,
    outreach,
    getOutreach,
    addProspect,
    updateProspect,
    deleteProspect,
    setMetric,
    bumpMetric,
  };
}
