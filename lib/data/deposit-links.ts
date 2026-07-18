/**
 * Deposit payment links — SERVER-ONLY (service-role).
 *
 * A groomer taking a booking over the phone can't take a card there and then.
 * These helpers let them generate a secure per-appointment link, send it to the
 * client by text themselves, and have the client pay the deposit on a simple
 * page — the money going straight into the groomer's own connected Stripe
 * account (a direct charge, exactly like the online-booking deposit).
 *
 *   generateDepositLink()        — authed groomer mints/reuses a link token
 *   resolveDepositLinkPublic()   — anonymous pay page + intent read the link
 *   confirmDepositLinkPayment()  — verify the PaymentIntent, mark deposit paid
 */
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rowToSettings } from "@/lib/data/settings";
import { getStripe, isStripeServerConfigured } from "@/lib/stripe/server";
import { hasPublishableKey } from "@/lib/stripe/connect";
import { sendEmail } from "@/lib/email/send";
import { depositLinkEmail } from "@/lib/email/templates";
import { DEFAULT_SETTINGS } from "@/lib/pricing";

/** A URL-safe, unguessable token for a deposit link. */
function mintToken(): string {
  return randomBytes(24).toString("base64url");
}

/** The public (anonymous) view of a deposit link, for the pay page + intent. */
export interface DepositLinkView {
  found: boolean;
  paid: boolean;
  /** Past its expiry (the appointment start) and still unpaid. */
  expired: boolean;
  amount: number;
  businessName: string;
  petName: string;
  serviceName: string;
  whenISO: string;
  address?: string;
  /** Present only when the deposit can actually be charged right now. */
  connectedAccountId?: string;
  publishableKey?: string;
  /** True when Stripe + the connected account are ready to take the payment. */
  chargeReady: boolean;
}

const NOT_FOUND: DepositLinkView = {
  found: false,
  paid: false,
  expired: false,
  amount: 0,
  businessName: "",
  petName: "",
  serviceName: "",
  whenISO: "",
  chargeReady: false,
};

interface ApptLinkRow {
  id: string;
  business_id: string;
  client_id: string;
  pet_id: string;
  service_id: string | null;
  start_at: string;
  deposit: number | string | null;
  deposit_status: string | null;
  deposit_payment_intent_id: string | null;
  deposit_link_token: string | null;
  deposit_link_expires_at: string | null;
}

const num = (v: number | string | null | undefined): number =>
  v == null ? 0 : typeof v === "string" ? Number(v) : v;

/** Resolve a deposit link by its token for the public pay page / intent route. */
export async function resolveDepositLinkPublic(token: string): Promise<DepositLinkView> {
  const clean = (token ?? "").trim();
  if (!clean) return NOT_FOUND;
  const admin = createSupabaseAdminClient();

  const { data: appt } = await admin
    .from("appointments")
    .select(
      "id, business_id, client_id, pet_id, service_id, start_at, deposit, deposit_status, deposit_payment_intent_id, deposit_link_token, deposit_link_expires_at",
    )
    .eq("deposit_link_token", clean)
    .maybeSingle();
  if (!appt) return NOT_FOUND;
  const a = appt as ApptLinkRow;

  const [{ data: biz }, { data: svc }, { data: pet }] = await Promise.all([
    admin
      .from("businesses")
      .select("name, address_line, city, postcode, stripe_connect_account_id, stripe_connect_charges_enabled")
      .eq("id", a.business_id)
      .maybeSingle(),
    a.service_id
      ? admin.from("services").select("name").eq("id", a.service_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("pets").select("name").eq("id", a.pet_id).maybeSingle(),
  ]);

  const b = (biz as {
    name?: string;
    address_line?: string;
    city?: string;
    postcode?: string;
    stripe_connect_account_id?: string | null;
    stripe_connect_charges_enabled?: boolean | null;
  } | null) ?? {};

  const paid = a.deposit_status === "paid";
  const expiresAt = a.deposit_link_expires_at ?? a.start_at;
  const expired = !paid && new Date(expiresAt).getTime() <= Date.now();
  const chargeReady =
    Boolean(b.stripe_connect_charges_enabled) &&
    Boolean(b.stripe_connect_account_id) &&
    isStripeServerConfigured() &&
    hasPublishableKey();

  return {
    found: true,
    paid,
    expired,
    amount: num(a.deposit),
    businessName: b.name ?? "Your groomer",
    petName: (pet as { name?: string } | null)?.name ?? "your dog",
    serviceName: (svc as { name?: string } | null)?.name ?? "Groom",
    whenISO: a.start_at,
    address: [b.address_line, b.city, b.postcode].filter(Boolean).join(", ") || undefined,
    connectedAccountId: chargeReady ? b.stripe_connect_account_id ?? undefined : undefined,
    publishableKey: chargeReady ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : undefined,
    chargeReady,
  };
}

export type GenerateDepositLinkResult =
  | { ok: true; token: string; url: string; amount: number; expiresAt: string; emailedTo: string | null }
  | { ok: false; error: "not_found" | "already_paid" | "not_connected" | "no_deposit" | "past"; message: string };

/**
 * Mint (or reuse) a deposit link for one of the caller's appointments. The
 * caller must already be resolved to `businessId` (via the signed-in user);
 * we re-check the appointment belongs to that business as defence in depth.
 */
export async function generateDepositLink(
  businessId: string,
  appointmentId: string,
  origin: string,
): Promise<GenerateDepositLinkResult> {
  const admin = createSupabaseAdminClient();

  const { data: apptRow } = await admin
    .from("appointments")
    .select(
      "id, business_id, client_id, pet_id, service_id, start_at, deposit, deposit_status, deposit_link_token, deposit_link_expires_at",
    )
    .eq("id", appointmentId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!apptRow) return { ok: false, error: "not_found", message: "That appointment couldn't be found." };
  const a = apptRow as ApptLinkRow;

  if (a.deposit_status === "paid") {
    return { ok: false, error: "already_paid", message: "This deposit has already been paid." };
  }
  if (new Date(a.start_at).getTime() <= Date.now()) {
    return { ok: false, error: "past", message: "This appointment has already passed." };
  }

  const { data: bizRow } = await admin
    .from("businesses")
    .select("id, name, logo_url, stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", businessId)
    .maybeSingle();
  const biz = (bizRow as {
    name?: string;
    logo_url?: string | null;
    stripe_connect_account_id?: string | null;
    stripe_connect_charges_enabled?: boolean | null;
  } | null) ?? {};

  const connectLive =
    Boolean(biz.stripe_connect_charges_enabled) &&
    Boolean(biz.stripe_connect_account_id) &&
    isStripeServerConfigured() &&
    hasPublishableKey();
  if (!connectLive) {
    return {
      ok: false,
      error: "not_connected",
      message: "Connect your Stripe account first to charge card deposits.",
    };
  }

  const { data: setting } = await admin
    .from("settings").select("*").eq("business_id", businessId).maybeSingle();
  const settings = setting ? rowToSettings(setting as never) : { ...DEFAULT_SETTINGS };
  const existingDeposit = num(a.deposit);
  const amount = existingDeposit > 0 ? existingDeposit : settings.depositAmount;
  if (!amount || amount <= 0) {
    return { ok: false, error: "no_deposit", message: "Set a deposit amount in Settings first." };
  }

  // Reuse an outstanding token so re-copying gives the same link.
  const token = a.deposit_link_token ?? mintToken();

  const { error: updErr } = await admin
    .from("appointments")
    .update({
      deposit: amount,
      deposit_status: "link_sent",
      deposit_link_token: token,
      deposit_link_expires_at: a.start_at,
    })
    .eq("id", a.id);
  if (updErr) throw updErr;

  const url = `${origin.replace(/\/$/, "")}/pay/${token}`;

  // Email the client the link too, if we have their address (best-effort).
  let emailedTo: string | null = null;
  try {
    const { data: client } = await admin
      .from("clients")
      .select("first_name, email")
      .eq("id", a.client_id)
      .maybeSingle();
    const c = client as { first_name?: string; email?: string } | null;
    if (c?.email) {
      const { data: svc } = a.service_id
        ? await admin.from("services").select("name").eq("id", a.service_id).maybeSingle()
        : { data: null };
      const { data: pet } = await admin.from("pets").select("name").eq("id", a.pet_id).maybeSingle();
      const when = new Date(a.start_at).toLocaleString("en-GB", {
        weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC",
      });
      const msg = depositLinkEmail({
        businessName: biz.name ?? "Your groomer",
        firstName: c.first_name ?? "there",
        petName: (pet as { name?: string } | null)?.name ?? "your dog",
        serviceName: (svc as { name?: string } | null)?.name ?? "Groom",
        whenLabel: when,
        amount,
        url,
        logoUrl: biz.logo_url ?? undefined,
      });
      const res = await sendEmail({ to: c.email, subject: msg.subject, html: msg.html });
      if (res.ok) emailedTo = c.email;
    }
  } catch (err) {
    console.error("deposit link email failed:", err);
  }

  return { ok: true, token, url, amount, expiresAt: a.start_at, emailedTo };
}

export type ConfirmDepositLinkResult =
  | { ok: true; alreadyPaid?: boolean }
  | { ok: false; error: "not_found" | "not_connected" | "payment_failed"; message: string };

/** Verify a paid PaymentIntent for a deposit link and mark the deposit paid. */
export async function confirmDepositLinkPayment(
  token: string,
  paymentIntentId: string,
): Promise<ConfirmDepositLinkResult> {
  const clean = (token ?? "").trim();
  const pi = (paymentIntentId ?? "").trim();
  if (!clean || !pi) return { ok: false, error: "not_found", message: "Invalid link." };
  const admin = createSupabaseAdminClient();

  const { data: apptRow } = await admin
    .from("appointments")
    .select("id, business_id, deposit, deposit_status, deposit_payment_intent_id")
    .eq("deposit_link_token", clean)
    .maybeSingle();
  if (!apptRow) return { ok: false, error: "not_found", message: "This link couldn't be found." };
  const a = apptRow as ApptLinkRow;
  if (a.deposit_status === "paid") return { ok: true, alreadyPaid: true };

  const { data: bizRow } = await admin
    .from("businesses")
    .select("stripe_connect_account_id")
    .eq("id", a.business_id)
    .maybeSingle();
  const connectedAccountId = (bizRow as { stripe_connect_account_id?: string | null } | null)
    ?.stripe_connect_account_id;
  if (!connectedAccountId || !isStripeServerConfigured()) {
    return { ok: false, error: "not_connected", message: "Payments aren't available for this link." };
  }

  let intent: { status?: string; currency?: string; amount?: number; amount_received?: number };
  try {
    intent = await getStripe().paymentIntents.retrieve(pi, undefined, {
      stripeAccount: connectedAccountId,
    });
  } catch {
    return { ok: false, error: "payment_failed", message: "We couldn't verify your payment — please try again." };
  }
  const expected = Math.round(num(a.deposit) * 100);
  const paidAmount = intent.amount_received || intent.amount || 0;
  if (intent.status !== "succeeded" || intent.currency !== "gbp" || paidAmount !== expected) {
    return { ok: false, error: "payment_failed", message: "Your payment didn't complete — please try again." };
  }

  const { error: updErr } = await admin
    .from("appointments")
    .update({ deposit_status: "paid", deposit_payment_intent_id: pi })
    .eq("id", a.id);
  if (updErr) throw updErr;
  return { ok: true };
}
