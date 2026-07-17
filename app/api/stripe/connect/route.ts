/**
 * Stripe Connect onboarding for the signed-in groomer.
 *
 *   GET  /api/stripe/connect  → { connected, chargesEnabled, detailsSubmitted }
 *        Reads (and refreshes from Stripe) the groomer's connected-account state.
 *   POST /api/stripe/connect  → { url }
 *        Creates the account on first use and returns a Stripe onboarding link.
 *
 * Auth: the logged-in Supabase user (their business owns the connected account).
 * Card deposits are direct charges on that account, so money never touches the
 * GroomOS platform balance.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isStripeServerConfigured } from "@/lib/stripe/server";
import {
  ensureConnectAccount,
  createOnboardingLink,
  refreshConnectStatus,
} from "@/lib/stripe/connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BizRow = { id: string; name: string | null; stripe_connect_account_id: string | null };

/** Resolve the caller's business row (or a NextResponse error to return). */
async function resolveBusiness(): Promise<
  { biz: BizRow; email?: string } | { error: NextResponse }
> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };

  const admin = createSupabaseAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  const businessId = (userRow as { business_id?: string } | null)?.business_id;
  if (!businessId) return { error: NextResponse.json({ error: "no_business" }, { status: 400 }) };

  const { data: biz } = await admin
    .from("businesses")
    .select("id, name, stripe_connect_account_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) return { error: NextResponse.json({ error: "no_business" }, { status: 400 }) };

  return { biz: biz as BizRow, email: user.email ?? undefined };
}

export async function GET() {
  if (!isStripeServerConfigured()) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const resolved = await resolveBusiness();
  if ("error" in resolved) return resolved.error;
  const { biz } = resolved;

  if (!biz.stripe_connect_account_id) {
    return NextResponse.json({
      connected: false,
      chargesEnabled: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
    });
  }

  try {
    const admin = createSupabaseAdminClient();
    const status = await refreshConnectStatus(admin, biz.id, biz.stripe_connect_account_id);
    return NextResponse.json(status);
  } catch (err) {
    console.error("connect status refresh failed:", err);
    return NextResponse.json({ error: "stripe_error", ...stripeErrorDetail(err) }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isStripeServerConfigured()) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const resolved = await resolveBusiness();
  if ("error" in resolved) return resolved.error;
  const { biz, email } = resolved;

  try {
    const admin = createSupabaseAdminClient();
    const accountId = await ensureConnectAccount(admin, biz, email);
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const url = await createOnboardingLink(accountId, origin);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("connect onboarding link failed:", err);
    return NextResponse.json({ error: "stripe_error", ...stripeErrorDetail(err) }, { status: 502 });
  }
}

/**
 * Pull the human-readable bits out of a Stripe error so the groomer sees the
 * real reason (e.g. "complete your Connect platform profile") instead of a
 * generic "please try again". These messages are Stripe's own setup guidance —
 * safe to show the authenticated account owner.
 */
function stripeErrorDetail(err: unknown): { message?: string; code?: string; type?: string } {
  const e = err as { message?: string; code?: string; type?: string; raw?: { message?: string } };
  return {
    message: e?.raw?.message ?? e?.message,
    code: e?.code,
    type: e?.type,
  };
}
