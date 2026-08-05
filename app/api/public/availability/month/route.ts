/**
 * GET /api/public/availability/month?slug=&month=YYYY-MM&minutes=
 * Per-day bookability for a whole month, for the public booking calendar — which
 * days have at least one free slot, plus the advance-booking window bounds.
 * Runs server-side (service-role); private appointments never leave the server.
 */
import { NextResponse } from "next/server";
import { publicMonthAvailability } from "@/lib/data/public-booking";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  const month = searchParams.get("month") ?? "";
  const minutes = Number(searchParams.get("minutes") ?? "60");
  if (!slug || !/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(minutes) || minutes <= 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const data = await publicMonthAvailability(slug, month, minutes);
    if (data === null) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
