"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, useInView } from "framer-motion";
import {
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Camera,
  Check,
  ChevronDown,
  Gauge,
  Lock,
  MapPin,
  Moon,
  PawPrint,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingWalkthrough } from "@/components/booking-walkthrough";
import { PawTrail } from "@/components/illustrations";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

// Built for solo groomers, not salons — five things that actually earn their keep.
const FEATURES: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Deposits that stop no-shows",
    body: "Clients pay a card deposit to lock in the slot — the ones with skin in the game turn up.",
  },
  {
    icon: Moon,
    title: "A booking page that works while you groom",
    body: "Clients book the slot they want in seconds — no more replying to DMs at 9pm.",
  },
  {
    icon: Bell,
    title: "Automatic reminders that cut no-shows",
    body: "A friendly nudge before every appointment, so far fewer forget. SMS coming soon.",
  },
  {
    icon: Gauge,
    title: "Matting meter & temperament scales",
    body: "Clients declare coat and temperament at booking — you set what you take, and every booking keeps the record.",
  },
  {
    icon: PawPrint,
    title: "Client & pet records that remember everything",
    body: "Coat notes, temperament, “sensitive paws,” last groom.",
  },
  {
    icon: Camera,
    title: "Before & after report cards",
    body: "The little touch that gets you referred.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "We build it with you",
    body: "One call. We add your services, prices and hours, and import your client list. You do nothing but talk.",
  },
  {
    n: "2",
    title: "Share one link",
    body: "Put it in your Instagram bio. Clients pick a slot, pay their deposit, done — no more booking DMs.",
  },
  {
    n: "3",
    title: "Get on with grooming",
    body: "Reminders go out automatically. Your calendar fills itself. No-shows pay for themselves.",
  },
];

// The maths that makes the price a non-decision — every figure is from the pitch,
// nothing invented.
const COST_ROWS = [
  { label: "Two no-shows (£45 each)", value: "£90" },
  { label: "Booking DMs (~1 hr a week)", value: "4+ hrs" },
  { label: "SMS bills & double-book slips", value: "£5+" },
];

// Every primary CTA points here — the 15-minute setup-call booking link. The
// handler falls back to entering the product if this is ever blanked out.
const SETUP_CALL_URL = "https://calendly.com/nailalfie4/set-up-call";

const CTA_LABEL = "Get set up free";
const HERO_SUB =
  "Clients book online, pay a card deposit upfront, and get reminders automatically — so no-shows either don't happen, or don't cost you.";
const HERO_UNDER_CTA =
  "We build your whole booking system for you on a 15-minute call. Free for 30 days, no card needed. 25 founding spots this month.";
const FINAL_CTA_SUBLINE = "15-minute setup call · 30 days free · 25 founding spots";

type Plan = {
  name: string;
  /** Per-month price billed monthly. */
  monthly: number;
  /** Per-month price when billed annually (~2 months free). */
  annual: number;
  tagline: string;
  /** Tier this one builds on — rendered as an "Everything in X, plus" lead-in. */
  inherits?: string;
  features: string[];
  /** Short reassurance line under the price (e.g. Pro's "pays for itself"). */
  note?: string;
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    monthly: 29,
    annual: 24,
    tagline: "The essentials, beautifully organised.",
    features: [
      "Smart colour-coded calendar",
      "24/7 online booking page",
      "Deposits & no-show protection",
      "Coat & temperament scales",
      "Unlimited client & pet records",
      "Email reminders",
    ],
    note: "Online booking and deposit protection included from day one — not locked behind a higher tier.",
  },
  {
    name: "Pro",
    monthly: 39,
    annual: 32,
    tagline: "Everything that saves time and makes money.",
    inherits: "Starter",
    features: [
      "SMS reminders (coming soon)",
      "Matting meter & smart pricing",
      "“Due for a groom” rebooking list",
      "Before & after reports",
    ],
    note: "A couple of saved no-shows a month more than covers it.",
    highlighted: true,
  },
  {
    name: "Team",
    monthly: 59,
    annual: 49,
    tagline: "For growing teams — multi-groomer support coming soon.",
    inherits: "Pro",
    features: ["Multi-groomer support (coming soon)", "Multiple locations (coming soon)", "Priority support"],
  },
];

// Straight answers to the questions groomers actually ask before starting.
const FAQS: { q: string; a: string }[] = [
  {
    q: "Do my clients need to download an app?",
    a: "No — your booking page is just a link. It works in any browser, on any phone.",
  },
  {
    q: "What if a client doesn't want to pay a deposit?",
    a: "Deposits are your choice, per business — turn them on or off, and set the amount that feels right.",
  },
  {
    q: "I'm not techy — how hard is setup?",
    a: "You do nothing. We build it with you on a 15-minute call.",
  },
  {
    q: "What happens after my 30 days free?",
    a: "£29/mo, cancel anytime, no contract. Founding groomers keep their rate for 12 months.",
  },
  {
    q: "Where does the deposit money go?",
    a: "Straight into your own Stripe account — you connect Stripe in a couple of taps, and GroomOS never holds your money.",
  },
  {
    q: "Can I move my existing clients over?",
    a: "Yes — we do it for you on the setup call. Bring an export or even a paper diary.",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * When true, the page renders in "static" mode: every scroll reveal, mount
 * animation and decorative effect on the hero + feature cards is switched off.
 * Toggled by `?static=1` so a static build can be A/B'd against the animated one
 * on a real device without a second deployment.
 */
const StaticModeContext = createContext(false);

/** Section eyebrow label. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
      {children}
    </p>
  );
}

/**
 * Reveal-on-scroll that fires EXACTLY ONCE and then permanently disconnects its
 * observer — so a section can never re-animate or flash when it re-enters the
 * viewport (framer's `whileInView` was re-triggering on iOS). It's a plain CSS
 * transition (no per-frame JS), the element always occupies its own space so
 * nothing shifts, and reduced-motion / static mode render it visible instantly.
 */
function useRevealOnce() {
  const isStatic = useContext(StaticModeContext);
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (isStatic || shown) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          obs.disconnect(); // fire once, then never observe again
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isStatic, shown]);
  return { ref, shown, isStatic };
}

function revealStyle(
  shown: boolean,
  isStatic: boolean,
  y: number,
  delay: number,
): CSSProperties | undefined {
  if (isStatic) return undefined;
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : `translateY(${y}px)`,
    transition: `opacity 520ms cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 520ms cubic-bezier(0.22,1,0.36,1) ${delay}s`,
  };
}

/** Fade-and-rise on scroll into view (exactly once). */
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
  const { ref, shown, isStatic } = useRevealOnce();
  return (
    <div ref={ref} className={className} style={revealStyle(shown, isStatic, y, delay)}>
      {children}
    </div>
  );
}

/**
 * A reveal wrapper that doubles as a card surface. There is deliberately NO
 * JS hover handler here: framer-motion's `whileHover` fires on iOS taps and
 * sticks. Any desktop hover lift is done in CSS (gated behind (hover: hover)),
 * so it can never trigger on touch.
 */
function RevealCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, shown, isStatic } = useRevealOnce();
  return (
    <div ref={ref} className={className} style={revealStyle(shown, isStatic, 18, delay)}>
      {children}
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
            You keep the £10 — so the no-show stings far less.
          </p>
        </div>
      </div>
    </div>
  );
}

/** The "your current setup" receipt used in the maths section. Figures come
 *  straight from the pitch — no invented totals. */
function CostReceipt() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-DEFAULT bg-surface p-6 shadow-lg ring-1 ring-border/60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
        Your current setup · per month
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {COST_ROWS.map((r) => (
          <div key={r.label} className="flex items-baseline gap-3">
            <span className="text-sm text-ink-muted">{r.label}</span>
            <span className="h-px flex-1 translate-y-[-2px] border-b border-dashed border-DEFAULT" />
            <span className="tabular-nums text-sm font-semibold text-ink">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-xl bg-accent-50 px-4 py-3">
        <span className="text-sm font-semibold text-ink">GroomOS</span>
        <span className="tabular-nums text-lg font-semibold text-accent-700">£29 / mo</span>
      </div>
    </div>
  );
}

/** Decorative founder mark — a warm brand emblem beside the founder note. We use
 *  a paw rather than a placeholder headshot; a real photo can replace this later. */
function FounderMark() {
  return (
    <div
      aria-hidden
      className="mx-auto flex h-40 w-40 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-100 to-accent-200 text-accent-600 ring-1 ring-border/60 sm:h-48 sm:w-48"
    >
      <PawPrint className="h-16 w-16" />
    </div>
  );
}

/** A single FAQ row — an accessible accordion that animates open/closed. */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-sunken sm:px-6"
      >
        <span className="text-sm font-semibold text-ink sm:text-base">{q}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-ink-subtle transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm leading-relaxed text-ink-muted sm:px-6">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Static preview of the coat/matting declaration scale (no animation, fixed
 *  height so it can't shift layout). Used in the matting-meter spotlight. */
function MattingMeterVisual() {
  const levels = [
    { label: "Smooth & brushed", accepted: true, selected: false },
    { label: "A few tangles", accepted: true, selected: false },
    { label: "Matted in places", accepted: true, selected: true },
    { label: "Heavily matted / pelted", accepted: false, selected: false },
  ];
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-DEFAULT bg-surface p-5 shadow-lg ring-1 ring-border/60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
        Declared at booking
      </p>
      <p className="mt-1.5 text-sm font-medium text-ink">How is your dog&apos;s coat right now?</p>
      <div className="mt-4 flex flex-col gap-2">
        {levels.map((l) => (
          <div
            key={l.label}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
              l.selected
                ? "border-accent bg-accent-50 font-medium text-ink"
                : !l.accepted
                  ? "border-dashed border-strong bg-surface text-ink-subtle"
                  : "border-DEFAULT bg-surface text-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                l.selected ? "border-accent bg-accent text-ink-inverse" : "border-strong",
              )}
            >
              {l.selected && <Check className="h-2.5 w-2.5" />}
            </span>
            <span className="flex-1">{l.label}</span>
            {!l.accepted && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
                Contact us
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-lg bg-surface-sunken p-2.5 text-xs text-ink-muted">
        Stored with the booking — so the coat that turns up matches what was declared.
      </p>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  // `?static=1` strips every animation/effect off the hero + feature cards so a
  // static build can be A/B'd against the animated one on a real phone. Read
  // after mount to keep server and first client paint identical (no hydration
  // mismatch); it flips on immediately on the client.
  const [staticMode, setStaticMode] = useState(false);
  useEffect(() => {
    try {
      setStaticMode(new URLSearchParams(window.location.search).get("static") === "1");
    } catch {
      /* no search params available — stay animated */
    }
  }, []);

  // Sticky mobile CTA: appears once the hero is scrolled past, and hides again
  // around the closing CTA so it never covers the final call-to-action.
  const heroRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef);
  const endInView = useInView(endRef);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("groomos.stickyCta") === "off") setStickyDismissed(true);
    } catch {
      /* storage unavailable — the sticky bar simply stays available */
    }
  }, []);
  function dismissSticky() {
    setStickyDismissed(true);
    try {
      localStorage.setItem("groomos.stickyCta", "off");
    } catch {
      /* ignore */
    }
  }
  const showSticky = !heroInView && !endInView && !stickyDismissed;

  // When real auth is on, send a logged-in visitor straight to their app.
  useEffect(() => {
    if (configured && !loading && user) router.replace("/dashboard");
  }, [configured, loading, user, router]);

  // Every "Get set up free" button lands here: the real setup-call booking link
  // once it's set, otherwise straight into the product (signup / demo).
  function handleCta() {
    if (SETUP_CALL_URL) {
      window.location.assign(SETUP_CALL_URL);
      return;
    }
    router.push(configured ? "/signup" : "/dashboard");
  }

  return (
    <StaticModeContext.Provider value={staticMode}>
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
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Quiet door into the app for existing users — visible on every
                  screen size, deliberately understated so it never competes
                  with the primary "Get set up free" CTA. */}
              <Link
                href="/login"
                className="rounded-lg px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              >
                Log in
              </Link>
              <Button size="sm" onClick={handleCta}>
                {CTA_LABEL}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section ref={heroRef} className="relative overflow-hidden">
          {/* soft blush glow — a big blurred layer is expensive to repaint on
              scroll (iOS stutter), so it's dropped entirely in static mode */}
          {!staticMode && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-32 z-0 mx-auto h-[26rem] max-w-3xl rounded-full bg-accent-100/45 blur-3xl"
            />
          )}
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-12">
              <motion.div
                initial={staticMode ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <Badge tone="accent" className="mb-5">
                  <PawPrint className="h-3.5 w-3.5" />
                  Built for home dog groomers
                </Badge>
                <h1 className="font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.015em] text-ink text-balance sm:text-[46px] lg:text-[54px]">
                  One no-show costs you £45.{" "}
                  <span className="text-accent">GroomOS costs £29.</span>
                </h1>
                <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
                  {HERO_SUB}
                </p>
                <div className="mt-8">
                  <Button size="lg" onClick={handleCta} className="w-full sm:w-auto">
                    {CTA_LABEL}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-5 max-w-md text-xs text-ink-muted">{HERO_UNDER_CTA}</p>
              </motion.div>

              {/* Client-booking widget — a single static frame (a picture of
                  the product). No entrance animation, so it paints in one go
                  with no flash. */}
              <div className="relative">
                {!staticMode && (
                  <div className="absolute -inset-5 -z-10 rounded-[28px] bg-accent-100/50 blur-2xl" />
                )}
                <BookingWalkthrough />
              </div>
            </div>
          </div>
        </section>

        {/* The maths — what the status quo actually costs */}
        <section className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <Reveal>
                <Eyebrow>The maths</Eyebrow>
                <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                  What your current setup actually costs
                </h2>
                <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">
                  Two no-shows a month × £45 a groom = £90 gone. An hour a week of
                  “hiya, are you free Tuesday?” DMs = 4+ hours a month you're not
                  grooming. A £5 SMS reminder bill here, a double-booking headache
                  there.
                </p>
                <p className="mt-4 text-base font-medium leading-relaxed text-ink sm:text-lg">
                  GroomOS is £29 a month. It pays for itself the first time a
                  no-show doesn't cost you —{" "}
                  <span className="text-accent">because you kept the deposit.</span>
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <CostReceipt />
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mx-auto mb-12 flex max-w-2xl flex-col items-center text-center sm:mb-16">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                Set up in 15 minutes. By us, not you.
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

        {/* Switching — dissolve the migration / lock-in fear */}
        <section className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
            <Reveal className="overflow-hidden rounded-3xl border border-DEFAULT bg-canvas p-7 shadow-card sm:p-9">
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
                  <ArrowRightLeft className="h-7 w-7" />
                </span>
                <div className="flex-1">
                  <h2 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink text-balance sm:text-[28px]">
                    Already using another system? We'll move you over.
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-ink-muted">
                    Bring an export or even a paper diary — we import your clients,
                    pets and history for you on your setup call. Switching takes one
                    call, not a weekend of typing.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Features — bento grid */}
        <section id="features" className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-12 max-w-2xl sm:mb-16">
              <Eyebrow>Everything, nothing more</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                Built by pet professionals, for pet professionals — scaled to fit you.
              </h2>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <RevealCard
                  key={title}
                  delay={(i % 3) * 0.06}
                  className="group flex h-full flex-col rounded-2xl border border-DEFAULT bg-canvas p-6 shadow-card transition-shadow duration-300 hover:shadow-md sm:p-7"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-100 text-accent-700 transition-colors duration-300 group-hover:bg-accent group-hover:text-ink-inverse">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
                </RevealCard>
              ))}
              {/* Simple paw motif completes the bento on wide screens */}
              <RevealCard
                delay={0.12}
                className="hidden flex-col items-center justify-center gap-4 rounded-2xl border border-DEFAULT bg-accent-50 p-6 text-accent-600 lg:flex"
              >
                <PawPrint className="h-10 w-10" />
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
                    A small card deposit on every booking keeps clients committed — and
                    means the ones who slip through leave something behind instead
                    of nothing.
                  </p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {[
                      "Set your own deposit — clients pay it by card to lock in the slot.",
                      "They show up? It comes straight off the price of the groom.",
                      "They don't? You keep the deposit, so a no-show stings far less.",
                      "Deposits land in your own Stripe account — connect it in a couple of taps.",
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
                    <Button size="lg" onClick={handleCta} className="w-full sm:w-auto">
                      {CTA_LABEL}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Trust micro-signals — small, true */}
                  <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-ink-subtle">
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Payments secured by Stripe
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Your data stays in the UK/EU
                    </span>
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

        {/* Matting meter & temperament — the "doodle tax" section */}
        <section className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <Reveal>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-700">
                  <Gauge className="h-3.5 w-3.5" /> Matting meter &amp; temperament
                </span>
                <h2 className="mt-4 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                  Stop arguing about the &ldquo;doodle tax&rdquo; at the counter
                </h2>
                <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
                  Clients honestly declare their dog&apos;s coat and temperament on a simple visual
                  scale when they book — so the pelted doodle and the dog that can&apos;t be safely
                  handled stop being a doorstep surprise.
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {[
                    "Clients self-assess on a clear, plain-English scale — no guesswork.",
                    "You choose which levels you take online; the rest are asked to contact you first.",
                    "Every booking carries a proof record of exactly what was declared.",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-ink sm:text-base">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                        <Check className="h-3 w-3" />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <Button size="lg" onClick={handleCta} className="w-full sm:w-auto">
                    {CTA_LABEL}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <MattingMeterVisual />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Origin / trust — built with a groomer */}
        <section className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mb-10 text-center">
              <Eyebrow>Why we built it</Eyebrow>
            </Reveal>
            <Reveal className="overflow-hidden rounded-3xl border border-DEFAULT bg-canvas p-7 shadow-card sm:p-10">
              <div className="grid gap-8 md:grid-cols-[auto,1fr] md:items-center md:gap-10">
                <FounderMark />
                <div>
                  <h2 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.01em] text-ink text-balance sm:text-[30px]">
                    Built with a groomer, not a tech company.
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg">
                    GroomOS exists because our co-founder — a working groomer — was
                    losing three or four slots a month to no-shows and spending her
                    evenings buried in booking DMs. We built the tool she actually
                    wanted: simple, calm, and paid for by the first no-show it
                    prevents.
                  </p>
                  <p className="mt-4 border-t border-DEFAULT pt-5 text-sm font-medium text-accent-700">
                    We're now setting up our first 25 UK groomers personally,
                    starting in Greater Manchester. Every account is built for you,
                    by us, on a call.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <Eyebrow>Honest pricing</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                Simple plans that grow with you
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-muted">
                Start with a free 30-day trial. No setup fees, no metered SMS, cancel any time.
              </p>
            </Reveal>

            {/* Founding offer */}
            <Reveal className="mb-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-50 px-4 py-2 text-center text-sm font-medium text-accent-700">
                <Sparkles className="h-4 w-4 shrink-0" />
                Founding groomer offer: your rate locked for your first 12 months.
              </div>
            </Reveal>

            <div className="grid items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
              {PLANS.map((p, i) => {
                const price = p.monthly;
                return (
                  <RevealCard
                    key={p.name}
                    delay={i * 0.08}
                    className={cn(
                      "relative flex h-full flex-col rounded-2xl border p-7 transition-shadow duration-300",
                      p.highlighted
                        ? "border-accent bg-gradient-to-b from-accent-50/70 to-surface shadow-xl ring-2 ring-accent/30 lg:-my-3 lg:py-10"
                        : "border-DEFAULT bg-surface shadow-card hover:shadow-md",
                    )}
                  >
                    {p.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge tone="accent"><Sparkles className="h-3.5 w-3.5" /> Most popular</Badge>
                      </div>
                    )}

                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      {p.name}
                    </p>
                    <p className="mt-2 text-sm text-ink-muted">{p.tagline}</p>

                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="font-display text-[44px] font-semibold leading-none tracking-tight text-ink tabular-nums">
                        £{price}
                      </span>
                      <span className="text-sm text-ink-muted">/ mo</span>
                    </div>
                    <p className="mt-1.5 h-4 text-xs text-ink-subtle">
                      billed monthly
                    </p>

                    {p.note && (
                      <p className="mt-4 flex items-start gap-2 rounded-lg bg-accent-50 px-3 py-2 text-xs font-medium text-accent-700">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {p.note}
                      </p>
                    )}

                    <div className="mt-6 flex flex-1 flex-col gap-3">
                      {p.inherits && (
                        <p className="text-sm font-medium text-ink">
                          Everything in {p.inherits}, plus:
                        </p>
                      )}
                      <ul className="flex flex-col gap-3">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                              <Check className="h-3 w-3" />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-7">
                      <Button
                        className="w-full"
                        size="lg"
                        variant={p.highlighted ? "primary" : "secondary"}
                        onClick={handleCta}
                      >
                        {CTA_LABEL}
                      </Button>
                      <p className="mt-2 text-center text-xs text-ink-subtle">No card needed</p>
                    </div>
                  </RevealCard>
                );
              })}
            </div>
            <p className="mt-8 text-center text-xs text-ink-subtle">
              30-day free trial on every plan · cancel any time.
            </p>
            <p className="mt-2 text-center text-xs text-ink-subtle">
              Email reminders are live and automatic today — SMS is next on the roadmap.
            </p>
          </div>
        </section>

        {/* Guarantee — risk reversal */}
        <section className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
            <Reveal className="overflow-hidden rounded-3xl border border-accent/20 bg-accent-50 p-8 text-center shadow-card sm:p-12">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-ink-inverse shadow-sm">
                <ShieldCheck className="h-7 w-7" />
              </span>
              <h2 className="mt-6 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[36px]">
                If it doesn't save you a no-show, it's free.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                Try GroomOS free for 30 days — no card, nothing to cancel. If it
                hasn't saved you at least one no-show within 60 days, your next two
                months are on us. The worst case is you get organised for free.
              </p>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-DEFAULT bg-canvas">
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
            <Reveal className="mb-10 text-center sm:mb-12">
              <Eyebrow>Good to know</Eyebrow>
              <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em] text-ink text-balance sm:text-[40px]">
                Questions, answered
              </h2>
            </Reveal>
            <div className="flex flex-col gap-3">
              {FAQS.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA + footer — the sticky mobile bar hides across this zone */}
        <div ref={endRef}>
        {/* Closing CTA */}
        <section className="border-t border-DEFAULT bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-14 text-center shadow-xl sm:px-12 sm:py-20">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-400/40 via-transparent to-accent-700/30"
                />
                <div className="relative">
                  <h2 className="mx-auto max-w-lg font-display text-[28px] font-semibold leading-tight tracking-tight text-ink-inverse text-balance sm:text-[40px]">
                    You'll wonder why you put up with the DMs.
                  </h2>
                  <div className="mt-8 flex justify-center">
                    <Button
                      size="lg"
                      onClick={handleCta}
                      className="bg-surface text-ink shadow-md hover:bg-canvas"
                    >
                      {CTA_LABEL}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mx-auto mt-5 max-w-md text-xs text-ink-inverse/75">
                    {FINAL_CTA_SUBLINE}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-DEFAULT">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
            <Logo />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-muted">
              <Link href="/login" className="transition-colors hover:text-ink">
                Log in
              </Link>
              <Link href="/book" target="_blank" className="transition-colors hover:text-ink">
                See the booking page
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-ink">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-ink">
                Terms
              </Link>
              <a href="mailto:nailalfie4@gmail.com" className="transition-colors hover:text-ink">
                Contact
              </a>
            </div>
            <div className="flex flex-col items-center gap-1.5 sm:items-end">
              <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
                <Lock className="h-3 w-3" /> Payments powered by Stripe
              </span>
              <p className="text-xs text-ink-subtle">© {new Date().getFullYear()} GroomOS</p>
            </div>
          </div>
        </footer>
        </div>

        {/* Sticky mobile CTA — appears after the hero, hides near the closing CTA */}
        <AnimatePresence>
          {showSticky && (
            <motion.div
              initial={{ y: 88, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 88, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="fixed inset-x-0 bottom-0 z-40 border-t border-DEFAULT bg-surface/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_-8px_rgba(42,36,34,0.25)] backdrop-blur-md md:hidden"
            >
              <div className="mx-auto flex max-w-md items-center gap-2">
                <button
                  type="button"
                  onClick={dismissSticky}
                  aria-label="Dismiss"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
                <Button size="sm" onClick={handleCta} className="flex-1">
                  {CTA_LABEL}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
    </StaticModeContext.Provider>
  );
}
