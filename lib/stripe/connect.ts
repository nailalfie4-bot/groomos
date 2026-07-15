/**
 * Stripe Connect (Express) helpers — SERVER-ONLY.
 *
 * Each groomer connects their OWN Stripe account so client card deposits are
 * charged straight into the groomer's balance (a direct charge on the connected
 * account — GroomOS never touches the money). These helpers create/onboard the
 * account and keep our mirror of `charges_enabled` fresh.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "./server";

/** How a business should handle deposits at booking time. */
export type DepositMode = "charge" | "recorded" | "off";

/**
 * Resolve the deposit behaviour for a business:
 *   'off'      — deposits disabled, or amount is zero
 *   'charge'   — connected account can accept charges → card-charge the deposit
 *   'recorded' — deposits on, but not connected yet → agree it, don't charge
 * Pure (no I/O) so it can be unit-tested and reused on both booking paths.
 */
export function depositModeFor(opts: {
  depositEnabled: boolean;
  depositAmount: number;
  chargesEnabled: boolean;
  stripeConfigured: boolean;
}): DepositMode {
  if (!opts.depositEnabled || opts.depositAmount <= 0) return "off";
  if (opts.chargesEnabled && opts.stripeConfigured) return "charge";
  return "recorded";
}

/** Whether the client-side publishable key is present (needed to charge). */
export function hasPublishableKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}

/**
 * Return the business's connected account id, creating an Express account on
 * first use and remembering it on the business row.
 */
export async function ensureConnectAccount(
  admin: SupabaseClient,
  business: { id: string; name?: string | null; stripe_connect_account_id?: string | null },
  email?: string,
): Promise<string> {
  if (business.stripe_connect_account_id) return business.stripe_connect_account_id;

  const account = await getStripe().accounts.create({
    type: "express",
    country: "GB",
    email: email ?? undefined,
    business_type: "individual",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: business.name ?? undefined,
      product_description: "Dog grooming appointments and deposits",
    },
    metadata: { business_id: business.id },
  });

  const { error } = await admin
    .from("businesses")
    .update({ stripe_connect_account_id: account.id })
    .eq("id", business.id);
  if (error) throw error;
  return account.id;
}

/** A one-time onboarding link the groomer follows to finish Stripe setup. */
export async function createOnboardingLink(accountId: string, origin: string): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/settings?connect=refresh`,
    return_url: `${origin}/settings?connect=done`,
    type: "account_onboarding",
  });
  return link.url;
}

/**
 * Retrieve the live account status from Stripe and mirror charges_enabled onto
 * the business row (so the public booking path can trust it without a Stripe
 * round-trip on every booking).
 */
export async function refreshConnectStatus(
  admin: SupabaseClient,
  businessId: string,
  accountId: string,
): Promise<ConnectStatus> {
  const acct = await getStripe().accounts.retrieve(accountId);
  const status: ConnectStatus = {
    connected: true,
    chargesEnabled: Boolean(acct.charges_enabled),
    detailsSubmitted: Boolean(acct.details_submitted),
    payoutsEnabled: Boolean(acct.payouts_enabled),
  };
  const { error } = await admin
    .from("businesses")
    .update({ stripe_connect_charges_enabled: status.chargesEnabled })
    .eq("id", businessId);
  if (error) throw error;
  return status;
}
