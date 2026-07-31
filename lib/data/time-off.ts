/**
 * Time-off data access — tenant-scoped blocks of unavailability. RLS limits
 * every query to the caller's own business. Consumed by the store (staff CRUD)
 * and, via rowToTimeOff, by the server-side public booking guard.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TimeOff } from "@/lib/types";

export interface TimeOffRow {
  id: string;
  business_id: string;
  groomer_id: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  label: string | null;
}

export function rowToTimeOff(r: TimeOffRow): TimeOff {
  return {
    id: r.id,
    businessId: r.business_id,
    groomerId: r.groomer_id ?? null,
    start: r.start_at,
    end: r.end_at,
    allDay: r.all_day,
    label: r.label ?? undefined,
  };
}

/** Fields needed to create/update a block. */
export interface TimeOffInput {
  groomerId?: string | null;
  start: string;
  end: string;
  allDay: boolean;
  label?: string;
}

function toRow(input: Partial<TimeOffInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.groomerId !== undefined) row.groomer_id = input.groomerId ?? null;
  if (input.start !== undefined) row.start_at = input.start;
  if (input.end !== undefined) row.end_at = input.end;
  if (input.allDay !== undefined) row.all_day = input.allDay;
  if (input.label !== undefined) row.label = input.label?.trim() || null;
  return row;
}

export async function fetchTimeOff(businessId: string): Promise<TimeOff[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("time_off")
    .select("*")
    .eq("business_id", businessId)
    .order("start_at", { ascending: true });
  if (error) throw error;
  return ((data as TimeOffRow[] | null) ?? []).map(rowToTimeOff);
}

export async function insertTimeOff(
  businessId: string,
  input: TimeOffInput,
  id?: string,
): Promise<TimeOff> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("time_off")
    .insert({ ...(id ? { id } : {}), business_id: businessId, ...toRow(input) })
    .select()
    .single();
  if (error) throw error;
  return rowToTimeOff(data as TimeOffRow);
}

export async function updateTimeOffRow(id: string, patch: Partial<TimeOffInput>): Promise<void> {
  const dbPatch = toRow(patch);
  if (Object.keys(dbPatch).length === 0) return;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("time_off").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteTimeOffRow(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("time_off").delete().eq("id", id);
  if (error) throw error;
}
