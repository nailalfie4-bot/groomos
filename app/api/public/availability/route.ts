/**
 * GET /api/public/availability?slug=&date=&minutes=
 * Free start times ("HH:MM") for a groom of `minutes` on `date` at a business.
 * Runs server-side with the service-role client — private appointments never
 * leave the server, only the free slots do.
 */
import { NextResponse } from "next/server";
import { publicAvailableSlots } from "@/lib/data/public-booking";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  const date = searchParams.get("date") ?? "";
  const minutes = Number(searchParams.get("minutes") ?? "60");
  if (!slug || !date || !Number.isFinite(minutes) || minutes <= 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const slots = await publicAvailableSlots(slug, date, minutes);
    if (slots === null) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
