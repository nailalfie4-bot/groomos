/**
 * POST /api/reminders/send — send a "you're due a groom" rebooking email to a
 * client, from the retention screen. Body: { petId }.
 *
 * Auth: the logged-in groomer. We verify the pet belongs to their business,
 * then email its owner via the shared email layer and stamp the reminder as
 * sent. Safe no-op (skipped) until email is configured.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { rebookingReminderEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = "https://groomos.vercel.app";

export async function POST(request: Request) {
  const {
    data: { user },
  } = await (await createSupabaseServerClient()).auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: { petId?: string };
  try {
    body = (await request.json()) as { petId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const petId = body.petId;
  if (!petId) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: userRow } = await admin.from("users").select("business_id").eq("id", user.id).maybeSingle();
  const businessId = (userRow as { business_id?: string } | null)?.business_id;
  if (!businessId) return NextResponse.json({ ok: false, error: "no_business" }, { status: 400 });

  // The pet must belong to this business (authorisation).
  const { data: pet } = await admin
    .from("pets")
    .select("id, name, client_id")
    .eq("id", petId)
    .eq("business_id", businessId)
    .maybeSingle();
  const p = pet as { id: string; name: string; client_id: string } | null;
  if (!p) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const { data: client } = await admin
    .from("clients")
    .select("first_name, email")
    .eq("id", p.client_id)
    .eq("business_id", businessId)
    .maybeSingle();
  const c = client as { first_name: string | null; email: string | null } | null;
  if (!c?.email) return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });

  if (!isEmailConfigured()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "email_not_configured" });
  }

  const { data: business } = await admin
    .from("businesses")
    .select("name, slug")
    .eq("id", businessId)
    .maybeSingle();
  const biz = business as { name: string | null; slug: string | null } | null;

  // Weeks since the pet's most recent completed groom.
  const { data: last } = await admin
    .from("appointments")
    .select("start_at")
    .eq("pet_id", petId)
    .eq("business_id", businessId)
    .eq("status", "completed")
    .order("start_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastAt = (last as { start_at?: string } | null)?.start_at;
  const weeksSince = lastAt
    ? Math.max(1, Math.round((Date.now() - new Date(lastAt).getTime()) / (7 * 86400000)))
    : 6;

  const msg = rebookingReminderEmail({
    businessName: biz?.name ?? "Your groomer",
    firstName: c.first_name ?? "there",
    petName: p.name,
    weeksSince,
    bookingUrl: biz?.slug ? `${SITE_URL}/book/${biz.slug}` : undefined,
  });

  const result = await sendEmail({ to: c.email, subject: msg.subject, html: msg.html });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? "send_failed" }, { status: 502 });
  }

  // Stamp the pet's completed grooms as reminded.
  await admin
    .from("appointments")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("pet_id", petId)
    .eq("status", "completed");

  return NextResponse.json({ ok: true, emailedTo: c.email });
}
