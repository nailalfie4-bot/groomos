/**
 * /pipeline — founder-only internal sales CRM. NOT customer-facing; there is no
 * link to it in any customer navigation.
 *
 * Access is gated here, server-side: the signed-in user's email must match the
 * FOUNDER_EMAIL env var (case-insensitive). Anyone else gets a 404. In demo mode
 * (no Supabase keys — which never happens in production) the gate is skipped so
 * the page can be developed and tested locally without a login.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pipeline · GroomOS",
  // Internal tool — keep it out of search engines entirely.
  robots: { index: false, follow: false },
};

// The founder gate must run on every request (it reads the session cookie), so
// this route is never statically pre-rendered into a gate-less shell.
export const dynamic = "force-dynamic";

async function assertFounder(): Promise<void> {
  if (!isSupabaseConfigured()) return; // local/demo playground only

  const founder = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  if (!founder) notFound(); // no founder configured → nobody gets in

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email || email !== founder) notFound();
}

export default async function PipelineLayout({ children }: { children: React.ReactNode }) {
  await assertFounder();
  return <>{children}</>;
}
