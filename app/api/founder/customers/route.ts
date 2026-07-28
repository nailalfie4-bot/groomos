/**
 * GET /api/founder/customers — founder-only customer-health dashboard data.
 *
 * Gated server-side by getFounder() (FOUNDER_EMAIL or the DB-only internal
 * plan), independently of the page's own gate. Reads one aggregated row per
 * business from the service-role-locked founder_customer_health() RPC and
 * returns computed health + plan + sorting. READ-ONLY: only aggregate counts and
 * account flags — never a customer's password or individual client records.
 *
 * In demo mode (no Supabase) it returns sample data so the view is developable.
 */
import { NextResponse } from "next/server";
import { getFounder } from "@/lib/auth/founder";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import {
  demoCustomers,
  sortByHealth,
  toCustomerHealth,
  type CustomerHealthRow,
} from "@/lib/founder/customer-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Founder gate (defence in depth — the page layer gates too).
  const founder = await getFounder();
  if (!founder) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (!isSupabaseConfigured() || !isAdminConfigured()) {
    return NextResponse.json({ ok: true, demo: true, customers: demoCustomers() });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("founder_customer_health");
  if (error) {
    console.error("founder_customer_health rpc failed:", error);
    return NextResponse.json(
      { ok: false, error: "query_failed", message: error.message },
      { status: 500 },
    );
  }

  const customers = sortByHealth((data as CustomerHealthRow[] ?? []).map(toCustomerHealth));
  return NextResponse.json({ ok: true, customers });
}
