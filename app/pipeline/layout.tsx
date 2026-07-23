/**
 * /pipeline (+ /pipeline/onboard) — founder-only internal tools. NOT customer-
 * facing; there is no link to it in any customer navigation.
 *
 * Access is gated here, server-side, via getFounder(): the caller is the founder
 * if their signed-in email matches the FOUNDER_EMAIL env var OR their account
 * carries the internal/owner plan (a DB-only flag). Anyone else gets a 404. In
 * demo mode (no Supabase keys — never in production) the gate is skipped so the
 * pages can be developed and tested locally without a login.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFounder } from "@/lib/auth/founder";

export const metadata: Metadata = {
  title: "Pipeline · GroomOS",
  // Internal tool — keep it out of search engines entirely.
  robots: { index: false, follow: false },
};

// The founder gate must run on every request (it reads the session cookie), so
// this route is never statically pre-rendered into a gate-less shell.
export const dynamic = "force-dynamic";

export default async function PipelineLayout({ children }: { children: React.ReactNode }) {
  const founder = await getFounder();
  if (!founder) notFound();
  return <>{children}</>;
}
