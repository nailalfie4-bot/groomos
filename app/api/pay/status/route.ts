/**
 * GET /api/pay/status?token=... — lightweight status of a deposit link.
 *
 * Used by the groomer's appointment sheet to reflect whether a sent link has
 * been paid yet. Returns only booleans (no client/appointment detail); the
 * token is a bearer secret already held by whoever generated or received it.
 */
import { NextResponse } from "next/server";
import { resolveDepositLinkPublic } from "@/lib/data/deposit-links";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, error: "not_available" }, { status: 404 });
  }
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const link = await resolveDepositLinkPublic(token).catch(() => null);
  if (!link || !link.found) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, paid: link.paid, expired: link.expired });
}
