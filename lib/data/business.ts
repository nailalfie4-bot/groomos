/**
 * Business (tenant) data access — the single businesses row the signed-in user
 * owns. RLS scopes reads/writes to the caller's own business.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Business } from "@/lib/types";

interface BusinessRow {
  id: string;
  name: string;
  open_hour: number;
  close_hour: number;
  stations: number;
  address_line: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
}

export function rowToBusiness(r: BusinessRow): Business {
  return {
    id: r.id,
    name: r.name,
    openHour: r.open_hour,
    closeHour: r.close_hour,
    stations: r.stations,
    addressLine: r.address_line ?? "",
    city: r.city ?? "",
    postcode: r.postcode ?? "",
    phone: r.phone ?? "",
  };
}

export async function fetchBusiness(businessId: string): Promise<Business | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToBusiness(data as BusinessRow) : null;
}

export async function updateBusinessRow(
  businessId: string,
  patch: Partial<Business>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.openHour !== undefined) dbPatch.open_hour = patch.openHour;
  if (patch.closeHour !== undefined) dbPatch.close_hour = patch.closeHour;
  if (patch.stations !== undefined) dbPatch.stations = patch.stations;
  if (patch.addressLine !== undefined) dbPatch.address_line = patch.addressLine;
  if (patch.city !== undefined) dbPatch.city = patch.city;
  if (patch.postcode !== undefined) dbPatch.postcode = patch.postcode;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (Object.keys(dbPatch).length === 0) return;

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("businesses").update(dbPatch).eq("id", businessId);
  if (error) throw error;
}
