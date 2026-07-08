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
