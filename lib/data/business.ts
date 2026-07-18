/**
 * Business (tenant) data access — the single businesses row the signed-in user
 * owns. RLS scopes reads/writes to the caller's own business.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Business } from "@/lib/types";

interface BusinessRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url?: string | null;
  open_hour: number;
  close_hour: number;
  stations: number;
  address_line: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  plan?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  stripe_connect_account_id?: string | null;
  stripe_connect_charges_enabled?: boolean | null;
}

export function rowToBusiness(r: BusinessRow): Business {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug ?? undefined,
    logoUrl: r.logo_url ?? undefined,
    openHour: r.open_hour,
    closeHour: r.close_hour,
    stations: r.stations,
    addressLine: r.address_line ?? "",
    city: r.city ?? "",
    postcode: r.postcode ?? "",
    phone: r.phone ?? "",
    plan: r.plan ?? undefined,
    subscriptionStatus: r.subscription_status ?? undefined,
    currentPeriodEnd: r.current_period_end ?? undefined,
    stripeConnectAccountId: r.stripe_connect_account_id ?? undefined,
    stripeConnectChargesEnabled: r.stripe_connect_charges_enabled ?? undefined,
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
  if (patch.slug !== undefined) dbPatch.slug = patch.slug;
  if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl || null;
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
