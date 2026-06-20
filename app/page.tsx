"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  PawPrint,
  Scissors,
  Users,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/mock/store";

const HIGHLIGHTS = [
  { icon: CalendarDays, label: "Calendar", text: "Day & week views" },
  { icon: Users, label: "Clients & pets", text: "Full grooming history" },
  { icon: Scissors, label: "Services", text: "Durations & pricing" },
  { icon: CreditCard, label: "Billing", text: "Simple monthly plans" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, hydrated, loginAsDemo, business } = useStore();

  // If a demo session already exists, skip straight to the app.
  useEffect(() => {
    if (hydrated && session) router.replace("/dashboard");
  }, [hydrated, session, router]);

  function enterDemo() {
    loginAsDemo();
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <a
          href="/showcase"
          className="text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Design system
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl"
        >
          <Badge tone="accent" className="mb-5">
            <PawPrint className="h-3.5 w-3.5" />
            Live demo · no sign-up
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Run your grooming business, calmly.
          </h1>
          <p className="mt-4 text-base text-ink-muted">
            Bookings, clients, pets, services and billing in one quiet place.
            This is a full working demo seeded with a fictional UK salon —{" "}
            <span className="font-medium text-ink">{business.name}</span>. No
            accounts, no keys, nothing to set up.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={enterDemo} size="md">
              Continue as demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <a href="/book" target="_blank">
              <Button variant="secondary" size="md">
                View public booking page
              </Button>
            </a>
          </div>
          <p className="mt-3 text-xs text-ink-subtle">
            Everything you do is stored in your browser for this session only.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, label, text }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: 0.08 * i,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rounded-xl border border-DEFAULT bg-surface p-4 shadow-card"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-medium text-ink">{label}</p>
              <p className="text-xs text-ink-muted">{text}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
