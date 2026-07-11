/**
 * GET /api/cron/reminders — daily job (Vercel Cron) that emails clients a
 * reminder ~24h before their appointment, then marks it so it's never sent
 * twice. Protected by CRON_SECRET (Vercel injects `Authorization: Bearer
 * <CRON_SECRET>` automatically). Safe no-op until email is configured.
 */
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { appointmentReminderEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reminders go out for appointments starting within this window from "now". */
const WINDOW_HOURS = 36;

function whenLabel(startISO: string): string {
  const d = new Date(startISO);
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const time = d
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" })
    .toLowerCase();
  return `${day} at ${time}`;
}

type Row = {
  id: string;
  start_at: string;
  deposit: number | string | null;
  client: { first_name: string | null; email: string | null } | null;
  pet: { name: string | null } | null;
  service: { name: string | null } | null;
  business: { name: string | null; address_line: string | null; city: string | null; postcode: string | null } | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminConfigured()) return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  if (!isEmailConfigured()) {
    return NextResponse.json({ skipped: true, reason: "email_not_configured" });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_HOURS * 3600 * 1000);

  const { data, error } = await admin
    .from("appointments")
    .select(
      "id, start_at, deposit, client:clients(first_name,email), pet:pets(name), service:services(name), business:businesses(name,address_line,city,postcode)",
    )
    .is("appointment_reminder_sent_at", null)
    .neq("status", "cancelled")
    .gte("start_at", now.toISOString())
    .lte("start_at", windowEnd.toISOString())
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Row[];
  let sent = 0;
  let failed = 0;

  for (const r of rows) {
    const email = r.client?.email?.trim();
    if (!email) continue;
    const deposit = r.deposit == null ? 0 : Number(r.deposit);
    const address = [r.business?.address_line, r.business?.city, r.business?.postcode].filter(Boolean).join(", ");
    const msg = appointmentReminderEmail({
      businessName: r.business?.name ?? "Your groomer",
      firstName: r.client?.first_name ?? "there",
      petName: r.pet?.name ?? "your dog",
      serviceName: r.service?.name ?? "Groom",
      whenLabel: whenLabel(r.start_at),
      address: address || undefined,
      depositLabel: deposit > 0 ? `£${deposit} deposit secures your slot.` : undefined,
    });
    const result = await sendEmail({ to: email, subject: msg.subject, html: msg.html });
    if (result.ok) {
      sent += 1;
      await admin
        .from("appointments")
        .update({ appointment_reminder_sent_at: new Date().toISOString() })
        .eq("id", r.id);
    } else {
      failed += 1;
      console.error("reminder email failed", r.id, result.error);
    }
  }

  return NextResponse.json({ scanned: rows.length, sent, failed });
}
