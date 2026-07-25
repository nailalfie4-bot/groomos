/**
 * POST /api/directory/removal — "request removal / this isn't my business".
 * Files a removal request into the admin queue, flags the listing, and emails
 * the founder. Best-effort: always confirms so a requester is never stuck.
 */
import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { createRemovalRequest } from "@/lib/directory/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: true }); // demo: nothing to store
  }
  let body: { groomerId?: string; reason?: string; requesterEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const groomerId = String(body.groomerId ?? "");
  if (!groomerId) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await createRemovalRequest({
      groomerId,
      reason: body.reason?.trim() || null,
      requesterEmail: body.requesterEmail?.trim() || null,
    });
  } catch {
    // swallow — the requester still gets a confirmation
  }
  return NextResponse.json({ ok: true });
}
