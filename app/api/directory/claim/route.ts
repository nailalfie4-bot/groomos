/**
 * POST /api/directory/claim — a groomer claims an unverified listing.
 * Creates a ClaimRequest (admin queue + founder email) and returns a signup URL
 * with the listing attached, so their new GroomOS account can populate it.
 */
import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { createClaimRequest } from "@/lib/directory/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: false, message: "Not available." }, { status: 503 });
  }
  let body: { groomerId?: string; name?: string; email?: string; phone?: string; businessVerification?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }
  const groomerId = String(body.groomerId ?? "");
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  if (!groomerId || !name || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "Name and a valid email are required." }, { status: 400 });
  }
  try {
    const id = await createClaimRequest({
      groomerId,
      name,
      email,
      phone: body.phone?.trim() || null,
      businessVerification: body.businessVerification?.trim() || null,
    });
    return NextResponse.json({ ok: true, redirectUrl: `/signup?claim=${id}&listing=${groomerId}` });
  } catch {
    return NextResponse.json({ ok: false, message: "Couldn't submit — please try again." }, { status: 500 });
  }
}
