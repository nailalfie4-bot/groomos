/**
 * Clients data access — tenant-scoped reads/writes for the Clients screens.
 * RLS limits every query to the caller's business; writes set business_id so
 * the with-check policy can vet them.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NewClientInput } from "@/lib/mock/store";
import type { Client } from "@/lib/types";

interface ClientRow {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export function rowToClient(r: ClientRow): Client {
  return {
    id: r.id,
    businessId: r.business_id,
    firstName: r.first_name,
    lastName: r.last_name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    createdAt: r.created_at,
  };
}

/** All clients for a business, newest first. */
export async function fetchClients(businessId: string): Promise<Client[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ClientRow[]).map(rowToClient);
}

/** Create a client in the caller's business; returns the stored row. */
export async function insertClient(
  businessId: string,
  input: NewClientInput,
): Promise<Client> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      business_id: businessId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToClient(data as ClientRow);
}
