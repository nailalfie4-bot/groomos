/**
 * Groomers data access — tenant-scoped staff list (name + colour). RLS limits
 * every query to the caller's own business. Consumed by the store, which falls
 * back to the mock seed when Supabase isn't configured.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Groomer } from "@/lib/types";

interface GroomerRow {
  id: string;
  business_id: string;
  name: string;
  colour: string;
  sort_order: number;
}

export function rowToGroomer(r: GroomerRow): Groomer {
  return { id: r.id, businessId: r.business_id, name: r.name, colour: r.colour };
}

/** Input for creating a groomer. */
export interface NewGroomerInput {
  name: string;
  colour: string;
}

export async function fetchGroomers(businessId: string): Promise<Groomer[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("groomers")
    .select("*")
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as GroomerRow[]).map(rowToGroomer);
}

export async function insertGroomer(
  businessId: string,
  input: NewGroomerInput,
  id?: string,
  sortOrder = 0,
): Promise<Groomer> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("groomers")
    .insert({
      ...(id ? { id } : {}),
      business_id: businessId,
      name: input.name,
      colour: input.colour,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToGroomer(data as GroomerRow);
}

export async function updateGroomerRow(
  id: string,
  patch: Partial<NewGroomerInput>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.colour !== undefined) dbPatch.colour = patch.colour;
  if (Object.keys(dbPatch).length === 0) return;
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("groomers").update(dbPatch).eq("id", id);
  if (error) throw error;
}

export async function deleteGroomerRow(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("groomers").delete().eq("id", id);
  if (error) throw error;
}

/** Assign (or clear, with null) the groomer on an appointment. */
export async function setAppointmentGroomerRow(
  appointmentId: string,
  groomerId: string | null,
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("appointments")
    .update({ groomer_id: groomerId })
    .eq("id", appointmentId);
  if (error) throw error;
}
