/**
 * Settings data access — tenant-scoped. Reads the single settings row for a
 * business (created by the signup trigger). Writes are added in the Settings
 * step. Falls back to DEFAULT_SETTINGS if the row is somehow missing.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_SETTINGS } from "@/lib/pricing";
import type { Declaration, DeclarationScale, Settings } from "@/lib/types";

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
  declarations: Declaration[] | null;
  terms_text: string | null;
  matting_scale: DeclarationScale | null;
  temperament_scale: DeclarationScale | null;
}

const validScale = (s: DeclarationScale | null | undefined): s is DeclarationScale =>
  !!s && Array.isArray(s.levels);

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
    declarations: Array.isArray(r.declarations) ? r.declarations : DEFAULT_SETTINGS.declarations,
    termsText: r.terms_text ?? "",
    mattingScale: validScale(r.matting_scale) ? r.matting_scale : DEFAULT_SETTINGS.mattingScale,
    temperamentScale: validScale(r.temperament_scale) ? r.temperament_scale : DEFAULT_SETTINGS.temperamentScale,
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

/** Patch the business's settings row (camelCase in → snake_case columns). */
export async function updateSettingsRow(
  businessId: string,
  patch: Partial<Settings>,
): Promise<void> {
  const map: Record<keyof Settings, string> = {
    bufferMin: "buffer_min",
    tangledFee: "tangled_fee",
    tangledExtraMin: "tangled_extra_min",
    mattedFee: "matted_fee",
    mattedExtraMin: "matted_extra_min",
    giantFee: "giant_fee",
    giantExtraMin: "giant_extra_min",
    remindersEnabled: "reminders_enabled",
    defaultRebookWeeks: "default_rebook_weeks",
    depositEnabled: "deposit_enabled",
    depositAmount: "deposit_amount",
    cancellationNoticeHours: "cancellation_notice_hours",
    declarations: "declarations",
    termsText: "terms_text",
    mattingScale: "matting_scale",
    temperamentScale: "temperament_scale",
  };
  const dbPatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = map[k as keyof Settings];
    if (col && v !== undefined) dbPatch[col] = v;
  }
  if (Object.keys(dbPatch).length === 0) return;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("settings").update(dbPatch).eq("business_id", businessId);
  if (error) throw error;
}
