/**
 * Services data access — real Supabase reads/writes for the Services screen.
 *
 * Everything here is tenant-scoped: Row Level Security on the `services` table
 * limits every query to the caller's own business, and each write also sets /
 * relies on `business_id` so the RLS "with check" clause can vet it. Callers
 * pass the current user's `businessId` (from AuthProvider) for clarity and as a
 * belt-and-braces filter; RLS is the actual security boundary.
 *
 * These functions only run client-side (they use the browser Supabase client)
 * and are consumed by the `useServices()` hook, which falls back to the mock
 * store when Supabase isn't configured.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NewServiceInput } from "@/lib/mock/store";
import type { Service } from "@/lib/types";

/** A raw `public.services` row (snake_case columns). */
interface ServiceRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_min: number;
  /** numeric(10,2) — PostgREST serialises this as a string, e.g. "45.00". */
  price_gbp: number | string;
  active: boolean;
  is_addon: boolean | null;
  /** Per-service deposit rule (0017). Absent on rows read before the migration. */
  deposit_type: string | null;
  deposit_value: number | string | null;
}

/** Map a DB row to the app's `Service` shape (camelCase, numeric price). */
export function rowToService(r: ServiceRow): Service {
  return {
    id: r.id,
    businessId: r.business_id,
    name: r.name,
    description: r.description ?? "",
    durationMin: r.duration_min,
    priceGBP: typeof r.price_gbp === "string" ? Number(r.price_gbp) : r.price_gbp,
    active: r.active,
    isAddon: Boolean(r.is_addon),
    // Defaults keep pre-migration rows (deposit_type absent) falling back to the
    // business deposit exactly as before.
    depositType: (r.deposit_type as Service["depositType"]) ?? "default",
    depositValue:
      r.deposit_value == null
        ? undefined
        : typeof r.deposit_value === "string"
          ? Number(r.deposit_value)
          : r.deposit_value,
  };
}

/**
 * All services for a business, oldest first. RLS also scopes this to the
 * caller, so the explicit `business_id` filter is just intent + defence.
 */
export async function fetchServices(businessId: string): Promise<Service[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ServiceRow[]).map(rowToService);
}

/**
 * Count of live (non-cancelled) appointments per service id, for the
 * "N booked" badge. Returns a map keyed by service id.
 */
export async function fetchBookedCounts(
  businessId: string,
): Promise<Record<string, number>> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("service_id,status")
    .eq("business_id", businessId)
    .neq("status", "cancelled");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data as { service_id: string | null; status: string }[]) {
    if (!row.service_id) continue; // service was deleted (set null)
    counts[row.service_id] = (counts[row.service_id] ?? 0) + 1;
  }
  return counts;
}

/** Create a service in the caller's business. Pass `id` to match an optimistic row. */
export async function insertService(
  businessId: string,
  input: NewServiceInput,
  id?: string,
): Promise<Service> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      ...(id ? { id } : {}),
      business_id: businessId,
      name: input.name,
      description: input.description,
      duration_min: input.durationMin,
      price_gbp: input.priceGBP,
      active: true,
      is_addon: input.isAddon ?? false,
      deposit_type: input.depositType ?? "default",
      deposit_value: input.depositValue ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToService(data as ServiceRow);
}

/** Update a service by id (RLS ensures it's one of ours). */
export async function updateService(
  id: string,
  patch: Partial<NewServiceInput>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.durationMin !== undefined) dbPatch.duration_min = patch.durationMin;
  if (patch.priceGBP !== undefined) dbPatch.price_gbp = patch.priceGBP;
  if (patch.isAddon !== undefined) dbPatch.is_addon = patch.isAddon;
  if (patch.depositType !== undefined) {
    dbPatch.deposit_type = patch.depositType;
    // Keep the stored value coherent with the type: only 'fixed'/'percent' use
    // it, so switching to 'default'/'none' clears any lingering amount.
    dbPatch.deposit_value =
      patch.depositType === "fixed" || patch.depositType === "percent"
        ? patch.depositValue ?? null
        : null;
  } else if (patch.depositValue !== undefined) {
    dbPatch.deposit_value = patch.depositValue ?? null;
  }
  if (Object.keys(dbPatch).length === 0) return;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("services").update(dbPatch).eq("id", id);
  if (error) throw error;
}

/** Delete a service by id (RLS ensures it's one of ours). */
export async function deleteService(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}
