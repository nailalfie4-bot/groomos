/**
 * POST /api/founder/clear-records — founder-only. Permanently delete a business's
 * operational records (clients, pets, appointments, services, groomers), keeping
 * the business + settings so the account still works. For clearing demo/test data
 * out of an account (including the founder's own).
 *
 * Gated server-side by getFounder() AND a typed "DELETE" confirmation, so no
 * customer-facing account can ever trigger it.
 */
import { NextResponse } from "next/server";
import { getFounder } from "@/lib/auth/founder";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Order matters for FKs: appointments reference clients/pets/services; pets
// reference clients — so delete children before parents.
const TABLES = ["appointments", "pets", "clients", "services", "groomers"] as const;

export async function POST(request: Request) {
  const founder = await getFounder();
  if (!founder) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!isAdminConfigured()) return NextResponse.json({ ok: false, error: "not_available" }, { status: 503 });

  let body: { businessId?: string; confirm?: string };
  try {
    body = (await request.json()) as { businessId?: string; confirm?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ ok: false, error: "confirm_required", message: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Target: an explicit business id, or the founder's own business.
  let businessId = (body.businessId ?? "").trim();
  if (!businessId) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await admin.from("users").select("business_id").eq("id", user.id).maybeSingle();
      businessId = (prof as { business_id?: string } | null)?.business_id ?? "";
    }
  }
  if (!businessId) return NextResponse.json({ ok: false, error: "no_business" }, { status: 400 });

  const deleted: Record<string, number> = {};
  for (const table of TABLES) {
    const { count, error } = await admin.from(table).delete({ count: "exact" }).eq("business_id", businessId);
    if (error) {
      return NextResponse.json({ ok: false, error: "delete_failed", table, message: error.message }, { status: 500 });
    }
    deleted[table] = count ?? 0;
  }
  return NextResponse.json({ ok: true, businessId, deleted });
}
