/**
 * "Your trial has ended" wall. Reached only when the 30-day trial is over with
 * no active subscription (the middleware redirects the main app here). It sits
 * OUTSIDE the (app) group so it isn't itself gated, and links to Billing — which
 * stays reachable — so the groomer can pick a plan and get straight back in.
 */
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Your trial has ended · GroomOS",
  robots: { index: false, follow: false },
};

export default function TrialEndedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-DEFAULT bg-surface">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4">
          <Logo />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-DEFAULT bg-surface p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-50 text-accent-700">
            <CalendarClock className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-ink">
            Your free trial has ended
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            We hope GroomOS earned its place. Choose a plan to pick up right where you left off —
            your clients, pets, calendar and settings are all exactly as you left them.
          </p>

          <Link
            href="/billing"
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-ink-inverse shadow-sm transition-colors hover:bg-accent-600"
          >
            Choose a plan
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-subtle">
            <Sparkles className="h-3.5 w-3.5" />
            Your public booking page keeps taking bookings in the meantime.
          </p>
        </div>
      </main>
    </div>
  );
}
