/**
 * Settings data access — tenant-scoped. Reads the single settings row for a
 * business (created by the signup trigger). Writes are added in the Settings
 * step. Falls back to DEFAULT_SETTINGS if the row is somehow missing.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_SETTINGS } from "@/lib/pricing";
import type { Settings } from "@/lib/types";

interface SettingsRow {
  business_id: string;
  buffer_min: number;
  tangled_fee: number | string;
  tangled_extra_min: number;
  matted_fee: number | string;
  matted_extra_min: number;
  giant_fee: number | string;
  giant_extra_min: number;
  reminders_enabled: boolean;
  default_rebook_weeks: number;
  deposit_enabled: boolean;
  deposit_amount: number | string;
  cancellation_notice_hours: number;
}

const num = (v: number | string): number => (typeof v === "string" ? Number(v) : v);

export function rowToSettings(r: SettingsRow): Settings {
  return {
    bufferMin: r.buffer_min,
    tangledFee: num(r.tangled_fee),
    tangledExtraMin: r.tangled_extra_min,
    mattedFee: num(r.matted_fee),
    mattedExtraMin: r.matted_extra_min,
    giantFee: num(r.giant_fee),
    giantExtraMin: r.giant_extra_min,
    remindersEnabled: r.reminders_enabled,
    defaultRebookWeeks: r.default_rebook_weeks,
    depositEnabled: r.deposit_enabled,
    depositAmount: num(r.deposit_amount),
    cancellationNoticeHours: r.cancellation_notice_hours,
  };
}

/** The business's settings row, or DEFAULT_SETTINGS if absent. */
export async function fetchSettings(businessId: string): Promise<Settings> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSettings(data as SettingsRow) : { ...DEFAULT_SETTINGS };
}
