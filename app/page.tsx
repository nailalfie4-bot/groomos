"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Heart,
  Moon,
  PawPrint,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { useStore } from "@/lib/mock/store";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Smart calendar",
    body: "Colour-coded and calm, with cleanup time added automatically so you can never double-book.",
  },
  {
    icon: Moon,
    title: "24/7 online booking",
    body: "Clients book themselves day or night — so you're not replying to texts at 9pm.",
  },
  {
    icon: Bell,
    title: "Reminders included",
    body: "Friendly automatic reminders go out on their own. Always included, never metered.",
  },
  {
    icon: Heart,
    title: "Matting meter",
    body: "Fair pricing for tricky coats, explained kindly to owners as care for their dog.",
  },
  {
    icon: Camera,
    title: "Before & after cards",
    body: "Send a lovely report after every groom. Owners share them — your best advertising.",
  },
  {
    icon: Sparkles,
    title: "Gentle rebooking",
    body: "One tap to get the next groom in the diary, and a nudge for anyone overdue.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Add your services & hours",
    body: "Tell us what you offer and when you work. That's the whole setup — about ten minutes.",
  },
  {
    n: "2",
    title: "Share your booking link",
    body: "Pop it on Facebook or your website. Clients book themselves, day or night.",
  },
  {
    n: "3",
    title: "Turn up and groom",
    body: "Reminders, rebooking and tidy receipts all happen on their own in the background.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I've got my evenings back. Clients book themselves and the reminders just go out — I'm not glued to my phone anymore.",
    name: "Sophie M.",
    biz: "The Mucky Pup · Leeds",
  },
  {
    quote:
      "Set up in an afternoon. My old software took weeks and cost nearly double.",
    name: "Daniel R.",
    biz: "Barklington Grooming · Bristol",
  },
  {
    quote:
      "The before-and-after cards get shared on Facebook constantly. Best advertising I've ever had.",
    name: "Aisha K.",
    biz: "Pampered Paws · Cardiff",
  },
  {
    quote:
      "No more surprise SMS bills. Everything's included — and it's actually lovely to look at.",
    name: "Grace T.",
    biz: "Tuck & Tidy · Glasgow",
  },
];

const PLANS = [
  {
    name: "Solo",
    price: 19,
    tagline: "Everything one home groomer needs.",
    features: ["Unlimited clients & pets", "Calendar & online booking", "Reminders included", "Before & after cards"],
    highlighted: false,
  },
  {
    name: "Pro",
    price: 29,
    tagline: "For a busy book that's filling up.",
    features: ["Everything in Solo", "Matting meter & smart pricing", "Rebooking & retention nudges", "No-show insights"],
    highlighted: true,
  },
  {
    name: "Salon",
    price: 49,
    tagline: "When you're ready to grow.",
    features: ["Everything in Pro", "Multiple groomers", "Multiple locations", "Priority support"],
    highlighted: false,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { session, hydrated, loginAsDemo } = useStore();

  useEffect(() => {
    if (hydrated && session) router.replace("/dashboard");
  }, [hydrated, session, router]);

  function startDemo() {
    loginAsDemo();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-DEFAULT bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#how" className="text-sm text-ink-muted transition-colors hover:text-ink">How it works</a>
            <a href="#features" className="text-sm text-ink-muted transition-colors hover:text-ink">Features</a>
            <a href="#pricing" className="text-sm text-ink-muted transition-colors hover:text-ink">Pricing</a>
          </nav>
          <Button size="sm" onClick={startDemo}>
            Start your free week
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-14 sm:px-8 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge tone="accent" className="mb-5">
              <PawPrint className="h-3.5 w-3.5" />
              Built for home dog groomers
            </Badge>
            <h1 className="text-3xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-[44px] sm:leading-[1.05]">
              Run your whole grooming day from your phone — and get your evenings back.
            </h1>
            <p className="mt-5 max-w-md text-base text-ink-muted sm:text-lg">
              GroomOS is the calm, beautiful little app for self-employed groomers.
              Bookings, reminders and happy clients — without the dense dashboards
              or the £80 SMS bills.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="md" onClick={startDemo}>
                Start your free week
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link href="/book" target="_blank">
                <Button variant="secondary" size="md">
                  See the booking page
                </Button>
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> No card required</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Set up in 10 minutes</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Reminders included</span>
            </div>
          </motion.div>

          {/* Mock app preview */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 -z-10 rounded-2xl bg-accent-100/50 blur-2xl" />
            <div className="rounded-2xl border border-DEFAULT bg-surface p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Today</p>
                  <p className="text-xs text-ink-subtle">Tuesday · 5 dogs in</p>
                </div>
                <Badge tone="accent">£215 booked</Badge>
              </div>
              <div className="mt-4 space-y-2.5">
                {[
                  { t: "09:00", pet: "Biscuit", svc: "Full Groom", s: "confirmed" as const },
                  { t: "10:30", pet: "Maple", svc: "Bath & Tidy", s: "confirmed" as const },
                  { t: "13:00", pet: "Bear", svc: "Full Groom · matted", s: "confirmed" as const },
                  { t: "15:30", pet: "Bramble", svc: "Full Groom", s: "pending" as const },
                ].map((r) => (
                  <div key={r.t} className="flex items-center gap-3 rounded-xl border border-DEFAULT bg-canvas px-3 py-2.5">
                    <span className="tabular-nums w-11 text-xs font-medium text-ink-muted">{r.t}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-700">
                      {r.pet.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{r.pet}</p>
                      <p className="truncate text-xs text-ink-subtle">{r.svc}</p>
                    </div>
                    <StatusBadge status={r.s} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">How it works</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Up and running before your next dog</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl border border-DEFAULT bg-surface p-6 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-ink-inverse">{s.n}</span>
              <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-DEFAULT bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-10 max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">Everything, nothing more</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              The bits you need, none of the clutter
            </h2>
            <p className="mt-3 text-base text-ink-muted">
              The big platforms are built for busy salons with reception desks. This
              is built for you and your grooming room next to the kitchen.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-DEFAULT bg-surface p-6 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">Loved by groomers</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">From people just like you</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-xl border border-DEFAULT bg-surface p-6 shadow-card">
              <div className="mb-3 flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="flex-1 text-sm leading-relaxed text-ink">“{t.quote}”</blockquote>
              <figcaption className="mt-4">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-ink-muted">{t.biz}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-DEFAULT bg-surface/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-8 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">Honest pricing</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Flat monthly price. Nothing metered.</h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-DEFAULT bg-surface px-4 py-1.5 text-sm font-medium text-ink">
                <Bell className="h-4 w-4 text-accent" /> Reminders included — no hidden SMS fees
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-DEFAULT bg-surface px-4 py-1.5 text-sm font-medium text-ink">
                <Clock className="h-4 w-4 text-accent" /> Set up in 10 minutes, not 10 days
              </span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-xl border bg-surface p-6 ${
                  p.highlighted ? "border-accent shadow-md ring-1 ring-accent/20" : "border-DEFAULT shadow-card"
                }`}
              >
                {p.highlighted && (
                  <div className="absolute -top-3 left-6">
                    <Badge tone="accent"><Sparkles className="h-3.5 w-3.5" /> Most popular</Badge>
                  </div>
                )}
                <h3 className="text-base font-semibold text-ink">{p.name}</h3>
                <p className="mt-1 text-sm text-ink-muted">{p.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="tabular-nums text-3xl font-semibold tracking-tight text-ink">£{p.price}</span>
                  <span className="text-sm text-ink-muted">/ month</span>
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={p.highlighted ? "primary" : "secondary"}
                  onClick={startDemo}
                >
                  Start your free week
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-ink-subtle">Free for 7 days. No card needed. Cancel any time.</p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="overflow-hidden rounded-2xl border border-DEFAULT bg-accent px-8 py-12 text-center shadow-md sm:py-16">
          <h2 className="mx-auto max-w-lg text-2xl font-semibold tracking-tight text-ink-inverse sm:text-3xl">
            Your evenings are waiting.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-inverse/85 sm:text-base">
            Try the whole thing free for a week. It only takes ten minutes to set up,
            and you can be taking bookings tonight.
          </p>
          <div className="mt-7 flex justify-center">
            <Button
              size="md"
              onClick={startDemo}
              className="bg-surface text-ink hover:bg-canvas"
            >
              Start your free week
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-DEFAULT">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-8">
          <Logo />
          <div className="flex items-center gap-5 text-xs text-ink-muted">
            <Link href="/book" target="_blank" className="transition-colors hover:text-ink">Booking page</Link>
            <Link href="/showcase" className="transition-colors hover:text-ink">Design system</Link>
            <button onClick={startDemo} className="inline-flex items-center gap-1 transition-colors hover:text-ink">
              <Scissors className="h-3.5 w-3.5" /> Enter demo
            </button>
          </div>
          <p className="text-xs text-ink-subtle">© {new Date().getFullYear()} GroomOS</p>
        </div>
      </footer>
    </div>
  );
}
