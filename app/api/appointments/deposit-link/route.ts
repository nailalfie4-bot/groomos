/**
 * POST /api/appointments/deposit-link — mint a deposit payment link.
 *
 * For a phone booking, the signed-in groomer generates a secure link for a
 * specific appointment; they text it to the client themselves (we send no SMS),
 * and we also email it if the client has an address on file. The client pays on
 * /pay/<token>, straight into the groomer's connected Stripe account.
 *
 * Body: { appointmentId }. Auth: the logged-in user's business must own the
 * appointment (re-checked server-side).
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isStripeServerConfigured } from "@/lib/stripe/server";
import { generateDepositLink } from "@/lib/data/deposit-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured() || !isStripeServerConfigured()) {
    return NextResponse.json({ ok: false, error: "not_available" }, { status: 503 });
  }

  // Resolve the caller's business from their Supabase session.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: userRow } = await admin
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  const businessId = (userRow as { business_id?: string } | null)?.business_id;
  if (!businessId) return NextResponse.json({ ok: false, error: "no_business" }, { status: 400 });

  let body: { appointmentId?: string };
  try {
    body = (await request.json()) as { appointmentId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const appointmentId = String(body.appointmentId ?? "");
  if (!appointmentId) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  try {
    const result = await generateDepositLink(businessId, appointmentId, origin);
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("deposit link generation failed:", err);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Something went wrong — please try again." },
      { status: 500 },
    );
  }
}
