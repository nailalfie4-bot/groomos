"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
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
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { DogSitting, DogLine, PawTrail } from "@/components/illustrations";
import { useStore } from "@/lib/mock/store";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Grid span on the large (lg) bento layout. */
  span?: string;
  /** Optional in-tile illustration for the wide bento tiles. */
  visual?: "timeline" | "meter";
};

const FEATURES: Feature[] = [
  {
    icon: CalendarDays,
    title: "Smart calendar",
    body: "Colour-coded and calm, with cleanup time added automatically so you can never double-book.",
    span: "lg:col-span-2",
    visual: "timeline",
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
    span: "lg:col-span-2",
    visual: "meter",
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

// Honest social proof: one real quote from the groomer who helped build
// GroomOS, plus open invitations for our first founding groomers.
const PHOEBE = {
  quote:
    "I groom dogs all day, so we built GroomOS around how the job actually feels — quick to use on your phone between dogs, and calm instead of cluttered. It's the tool I always wished I'd had.",
  name: "Phoebe",
  role: "Professional dog groomer · helped build GroomOS",
};

const FOUNDING_INVITES = [
  "Be one of our first groomers — your words could go here.",
  "Your salon's story could sit right here.",
  "Loved using GroomOS? We'd love to feature you next.",
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
    features: ["Everything in Solo", "Matting meter & smart pricing", "Rebooking & retention nudges", "Deposits & no-show protection"],
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

const EASE = [0.22, 1, 0.36, 1] as const;

/** Section eyebrow label. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
      {children}
    </p>
  );
}

/** Fade-and-rise on scroll into view (once). Respects reduced motion via MotionConfig. */
function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A reveal wrapper that doubles as a card surface with a subtle hover lift. */
function RevealCard({
  children,
  className,
  delay = 0,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -4 } : undefined}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Mini schedule used in the "Smart calendar" bento tile. */
function TimelineVisual() {
  const rows = [
    { t: "09:00", name: "Biscuit", dot: "bg-accent" },
    { t: "10:30", name: "Maple", dot: "bg-accent-300" },
    { t: "13:00", name: "Bear", dot: "bg-accent-200" },
  ];
  return (
    <div className="grid gap-1.5 sm:max-w-sm">
      {rows.map((r) => (
        <div
          key={r.t}
          className="flex items-center gap-2.5 rounded-lg border border-DEFAULT bg-canvas px-3 py-2"
        >
          <span className="tabular-nums text-[11px] font-medium text-ink-muted">{r.t}</span>
          <span className={cn("h-2 w-2 rounded-full", r.dot)} />
          <span className="text-xs text-ink">{r.name}</span>
          <span className="ml-auto text-[10px] font-medium text-ink-subtle">+ cleanup</span>
        </div>
      ))}
    </div>
  );
}

/** Matting gauge used in the "Matting meter" bento tile. */
function MeterVisual() {
  return (
    <div className="sm:max-w-sm">
      <div className="flex items-center justify-between text-[11px] font-medium text-ink-muted">
        <span>Light coat</span>
        <span>Heavily matted</span>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-gradient-to-r from-accent-100 via-accent-200 to-accent-600">
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent shadow-sm"
          style={{ left: "62%" }}
        />
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-medium text-accent-700">
        <Sparkles className="h-3 w-3" /> Fair +£8 added, explained kindly
      </div>
    </div>
  );
}

/** Deposit outcome mock used in the no-show protection spotlight. */
function DepositVisual() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-DEFAULT bg-surface p-5 shadow-lg ring-1 ring-border/60">
      {/* Booking header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-[11px] font-semibold text-accent-700">
            B
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Biscuit · Full Groom</p>
            <p className="text-xs text-ink-subtle">Tue · 09:00 · £45</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">
          <ShieldCheck className="h-3 w-3" /> £10 held
        </span>
      </div>

      <div className="my-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        <span className="h-px flex-1 bg-DEFAULT" />
        Two ways it pays
        <span className="h-px flex-1 bg-DEFAULT" />
      </div>

      {/* Outcome: shows up */}
      <div className="flex items-start gap-3 rounded-xl border border-DEFAULT bg-canvas p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-deep">
          <Check className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">They show up</p>
          <p className="text-xs text-ink-muted">
            The £10 comes off the groom — they pay £35 on the day.
          </p>
        </div>
      </div>

      {/* Outcome: no-show */}
      <div className="mt-2.5 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent-50 p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-ink-inverse">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">No-show</p>
          <p className="text-xs text-accent-700">
            You keep the £10. The empty slot is covered, not lost.
          </p>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

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
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-canvas">
        {/* Nav */}
        <header className="sticky top-0 z-50 border-b border-DEFAULT bg-canvas/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
            <Logo />
            <nav className="hidden items-center gap-8 md:flex">
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
        <section className="relative overflow-hidden">
          {/* soft blush glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-32 z-0 mx-auto h-[26rem] max-w-3xl rounded-full bg-accent-100/45 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-12">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <Badge tone="accent" className="mb-5">
                  <PawPrint className="h-3.5 w-3.5" />
                  Built for home dog groomers
                </Badge>
                <h1 className="font-display text-[34px] font-semibold leading-[1.04] tracking-[-0.015em] text-ink text-balance sm:text-[48px] lg:text-[56px]">
                  Run your whole grooming day from your phone — and get your{" "}
                  <span className="italic text-accent">evenings</span> back.
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
                  GroomOS is the calm, beautiful little app for self-employed groomers.
                  Bookings, reminders and happy clients — without the dense dashboards
                  or the £80 SMS bills.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button size="lg" onClick={startDemo} className="w-full sm:w-auto">
                    Start your free week
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Link href="/book" target="_blank" className="w-full sm:w-auto">
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                      See the booking page
                    </Button>
                  </Link>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> No card required</span>
                  <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Set up in 10 minutes</span>
                  <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Reminders included</span>
                </div>
              </motion.div>

              {/* Mock app preview */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
                className="relative"
              >
                <div className="absolute -inset-5 -z-10 rounded-[28px] bg-accent-100/50 blur-2xl" />
                <div className="rounded-2xl border border-DEFAULT bg-surface p-5 shadow-xl ring-1 ring-border/60">
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

                {/* Floating reminder toast */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
                  className="absolute -right-3 -top-5 hidden items-center gap-2.5 rounded-xl border border-DEFAULT bg-surface px-3 py-2 shadow-md sm:flex"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-soft text-success-deep">
                    <Bell className="h-3.5 w-3.5" />
                  </span>
                  <div className="text-[11px] leading-tight">
                    <p className="font-semibold text-ink">Reminder sent</p>
                    <p className="text-ink-subtle">Maple · tomorrow 10:30</p>
                  </div>
                </motion.div>

                {/* Friendly flat-dog accent peeking from the booking card */}
                <DogSitting
                  className="absolute -bottom-7 -left-7 hidden w-24 drop-shadow-sm lg:block"
                  bow
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mx-auto mb-12 flex max-w-2xl flex-col items-center text-center sm:mb-16">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                Up and running before your next dog
              </h2>
              <PawTrail className="mt-5" />
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
              {STEPS.map((s, i) => (
                <RevealCard
                  key={s.n}
                  delay={i * 0.08}
                  className="flex h-full flex-col rounded-2xl border border-DEFAULT bg-surface p-6 shadow-card transition-shadow duration-300 hover:shadow-md sm:p-7"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-display text-lg font-semibold text-ink-inverse shadow-sm">
                    {s.n}
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* Features — bento grid */}
        <section id="features" className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-12 max-w-2xl sm:mb-16">
              <Eyebrow>Everything, nothing more</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                The bits you need, none of the clutter
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
                The big platforms are built for busy salons with reception desks. This
                is built for you and your grooming room next to the kitchen.
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body, span, visual }, i) => (
                <RevealCard
                  key={title}
                  delay={(i % 3) * 0.06}
                  className={cn(
                    "group flex h-full flex-col rounded-2xl border border-DEFAULT bg-surface p-6 shadow-card transition-shadow duration-300 hover:shadow-md sm:p-7",
                    span,
                  )}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-100 text-accent-700 transition-colors duration-300 group-hover:bg-accent group-hover:text-ink-inverse">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
                  {visual === "timeline" && (
                    <div className="mt-6 sm:mt-auto sm:pt-6">
                      <TimelineVisual />
                    </div>
                  )}
                  {visual === "meter" && (
                    <div className="mt-6 sm:mt-auto sm:pt-6">
                      <MeterVisual />
                    </div>
                  )}
                </RevealCard>
              ))}
              {/* Decorative fine-line dog tile completes the 3×3 bento */}
              <RevealCard
                delay={0.12}
                hover={false}
                className="hidden flex-col items-center justify-center gap-3 rounded-2xl border border-DEFAULT bg-accent-50 p-6 text-accent-600 lg:flex"
              >
                <DogLine className="w-24" />
                <PawTrail />
              </RevealCard>
            </div>
          </div>
        </section>

        {/* Deposits & no-show protection — the feature that pays for itself */}
        <section className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="overflow-hidden rounded-3xl border border-accent/15 bg-gradient-to-br from-accent-50 via-surface to-surface shadow-card">
              <div className="grid items-center gap-10 p-7 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
                {/* Copy */}
                <Reveal>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-700">
                    <ShieldCheck className="h-3.5 w-3.5" /> Deposits & no-show protection
                  </span>
                  <h2 className="mt-4 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                    The feature that pays for itself
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
                    One no-show costs more than a month of GroomOS. Take a small
                    deposit to confirm every booking and never eat the cost of an
                    empty chair again.
                  </p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {[
                      "Set your own deposit — clients pay it to lock in the slot.",
                      "They show up? It comes straight off the price of the groom.",
                      "They don't? You keep it — the wasted slot is covered, not lost.",
                      "Set a fair cancellation window so everyone knows the rules.",
                    ].map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-2.5 text-sm text-ink sm:text-base"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                          <Check className="h-3 w-3" />
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-7">
                    <Button size="lg" onClick={startDemo} className="w-full sm:w-auto">
                      Protect your book
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Reveal>

                {/* Visual mock */}
                <Reveal delay={0.1}>
                  <DepositVisual />
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
              <Eyebrow>Built with a groomer</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                From people just like you
              </h2>
              <p className="mt-4 text-base text-ink-muted">
                We&apos;re new — built with a working groomer, looking for our first few to shape it.
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {/* The real quote */}
              <RevealCard className="flex h-full flex-col rounded-2xl border border-DEFAULT bg-canvas p-6 shadow-card transition-shadow duration-300 hover:shadow-md">
                <div className="mb-4 flex gap-0.5 text-accent">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="flex-1 font-display text-[17px] leading-snug text-ink text-pretty">
                  “{PHOEBE.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
                    {initials(PHOEBE.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{PHOEBE.name}</p>
                    <p className="text-xs leading-snug text-ink-muted">{PHOEBE.role}</p>
                  </div>
                </figcaption>
              </RevealCard>

              {/* Founding-groomer invitations */}
              {FOUNDING_INVITES.map((invite, i) => (
                <RevealCard
                  key={i}
                  delay={(i + 1) * 0.06}
                  className="flex h-full flex-col rounded-2xl border border-DEFAULT bg-canvas p-6 shadow-card transition-shadow duration-300 hover:shadow-md"
                >
                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-700">
                    <Sparkles className="h-3 w-3" /> Founding groomer
                  </span>
                  <blockquote className="flex-1 font-display text-[17px] leading-snug text-ink-muted text-pretty">
                    “{invite}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-strong text-ink-subtle">
                      <PawPrint className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Your name here</p>
                      <p className="text-xs leading-snug text-ink-muted">Your grooming business</p>
                    </div>
                  </figcaption>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* Before & After */}
        <section className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mx-auto mb-12 flex max-w-2xl flex-col items-center text-center sm:mb-16">
              <Eyebrow>Before &amp; after</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                Every groom, worth showing off
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
                A lovely little card after each visit — the kind clients share on
                Facebook. Add your own photos and these fill with real
                before-and-afters.
              </p>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { name: "Biscuit", breed: "Cockapoo" },
                { name: "Bear", breed: "Bernese Mountain Dog" },
                { name: "Maple", breed: "Cavalier" },
              ].map((d, i) => (
                <RevealCard
                  key={d.name}
                  delay={i * 0.08}
                  className="overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card transition-shadow duration-300 hover:shadow-md"
                >
                  <div className="grid grid-cols-2 gap-px bg-DEFAULT">
                    <div className="relative flex items-end justify-center bg-surface-sunken px-4 pt-6">
                      <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-inverse">
                        Before
                      </span>
                      <DogSitting className="w-20" scruff />
                    </div>
                    <div className="relative flex items-end justify-center bg-accent-50 px-4 pt-6">
                      <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-inverse">
                        After
                      </span>
                      <DogSitting className="w-20" bow />
                    </div>
                  </div>
                  <figcaption className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{d.name}</p>
                      <p className="text-xs text-ink-subtle">{d.breed}</p>
                    </div>
                    <p className="text-xs font-medium text-accent">Your real grooms go here</p>
                  </figcaption>
                </RevealCard>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <Eyebrow>Honest pricing</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                Flat monthly price. Nothing metered.
              </h2>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-DEFAULT bg-surface px-4 py-1.5 text-sm font-medium text-ink shadow-xs">
                  <Bell className="h-4 w-4 text-accent" /> Reminders included — no hidden SMS fees
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-DEFAULT bg-surface px-4 py-1.5 text-sm font-medium text-ink shadow-xs">
                  <Clock className="h-4 w-4 text-accent" /> Set up in 10 minutes, not 10 days
                </span>
              </div>
            </Reveal>

            <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
              {PLANS.map((p, i) => (
                <RevealCard
                  key={p.name}
                  delay={i * 0.08}
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border bg-surface p-7 transition-shadow duration-300",
                    p.highlighted
                      ? "border-accent shadow-lg ring-1 ring-accent/20 lg:-my-2 lg:py-9"
                      : "border-DEFAULT shadow-card hover:shadow-md",
                  )}
                >
                  {p.highlighted && (
                    <div className="absolute -top-3 left-7">
                      <Badge tone="accent"><Sparkles className="h-3.5 w-3.5" /> Most popular</Badge>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-ink">{p.name}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{p.tagline}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-[40px] font-semibold leading-none tracking-tight text-ink tabular-nums">£{p.price}</span>
                    <span className="text-sm text-ink-muted">/ month</span>
                  </div>
                  <ul className="mt-6 flex flex-1 flex-col gap-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                          <Check className="h-3 w-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-7 w-full"
                    size="lg"
                    variant={p.highlighted ? "primary" : "secondary"}
                    onClick={startDemo}
                  >
                    Start your free week
                  </Button>
                </RevealCard>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-ink-subtle">Free for 7 days. No card needed. Cancel any time.</p>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-14 text-center shadow-xl sm:px-12 sm:py-20">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-400/40 via-transparent to-accent-700/30"
                />
                {/* Fine-line dogs, well-placed */}
                <DogLine className="pointer-events-none absolute -bottom-6 -left-5 w-32 text-ink-inverse/15 sm:w-40" />
                <DogLine className="pointer-events-none absolute -right-5 -top-8 hidden w-28 rotate-6 text-ink-inverse/10 sm:block" />
                <div className="relative">
                  <h2 className="mx-auto max-w-lg font-display text-[28px] font-semibold leading-tight tracking-tight text-ink-inverse text-balance sm:text-[40px]">
                    Your evenings are waiting.
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-sm text-ink-inverse/85 sm:text-base">
                    Try the whole thing free for a week. It only takes ten minutes to set up,
                    and you can be taking bookings tonight.
                  </p>
                  <div className="mt-8 flex justify-center">
                    <Button
                      size="lg"
                      onClick={startDemo}
                      className="bg-surface text-ink shadow-md hover:bg-canvas"
                    >
                      Start your free week
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-DEFAULT">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
            <Logo />
            <div className="flex items-center gap-5 text-xs text-ink-muted">
              <Link href="/book" target="_blank" className="transition-colors hover:text-ink">Booking page</Link>
              <button onClick={startDemo} className="inline-flex items-center gap-1 transition-colors hover:text-ink">
                <Scissors className="h-3.5 w-3.5" /> Enter demo
              </button>
            </div>
            <p className="text-xs text-ink-subtle">© {new Date().getFullYear()} GroomOS</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
