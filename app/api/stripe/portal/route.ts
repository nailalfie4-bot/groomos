/**
 * POST /api/stripe/portal — open the Stripe Billing Portal so a groomer can
 * update their card, switch plan, or cancel. Returns the portal URL.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeServerConfigured } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isStripeServerConfigured()) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  const businessId = (userRow as { business_id?: string } | null)?.business_id;
  if (!businessId) return NextResponse.json({ error: "no_business" }, { status: 400 });

  const { data: biz } = await admin
    .from("businesses")
    .select("stripe_customer_id")
    .eq("id", businessId)
    .maybeSingle();
  const customerId = (biz as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
  if (!customerId) return NextResponse.json({ error: "no_customer" }, { status: 400 });

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
