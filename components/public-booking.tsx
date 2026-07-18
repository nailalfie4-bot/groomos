"use client";

/**
 * Public booking flow for one business (real Supabase data, injected by the
 * /book/<slug> server component). Rebuilt for dog owners on a phone: one step
 * at a time, big tap targets, autofill-friendly, no jargon, no account.
 *
 *   Service → Day & time → Your details → Deposit → Confirmed
 *
 * Availability comes from /api/public/availability (private appointments never
 * reach the browser); submitting posts to /api/public/booking. Slot times are
 * UTC wall-clock to stay perfectly in step with the server.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  CalendarPlus,
  CalendarX2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Logo } from "@/components/logo";
import { BusinessLogo } from "@/components/business-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatGBP } from "@/lib/format";
import { computeQuote, SIZE_LABEL } from "@/lib/pricing";
import type { Business, CoatCondition, DeclarationScale, DogSize, Service, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * How this business handles the deposit, resolved on the server from its
 * settings + connected Stripe account (see lib/data/public-booking):
 *   'charge'   — card-charged at booking, straight into the groomer's account
 *   'recorded' — agreed but not charged (groomer hasn't connected Stripe yet)
 *   'off'      — no deposit
 */
export type PublicDepositConfig = {
  mode: "charge" | "recorded" | "off";
  amount: number;
  connectedAccountId?: string;
  publishableKey?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIZES: DogSize[] = ["small", "medium", "large", "giant"];
const EASE = [0.22, 1, 0.36, 1] as const;

// "checks" (declarations + T&Cs) is conditional — only present when the groomer
// has configured any. Step numbering is derived from the active steps below.
type Step = "service" | "when" | "details" | "checks" | "deposit" | "done";
const STEP_TITLE: Record<Exclude<Step, "done">, string> = {
  service: "Choose your groom",
  when: "Pick a day & time",
  details: "Your details",
  checks: "A few quick checks",
  deposit: "Secure your slot",
};

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** The next `n` days as YYYY-MM-DD, starting today. */
function nextDays(n: number): string[] {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return toDateValue(d);
  });
}

/** "13:00" → "1:00 pm". */
function slotLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? "am" : "pm";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Split a single "name" field into first + rest (rest may be empty). */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Build a downloadable .ics calendar event as a data: URI (no dependencies). */
function icsHref(opts: {
  title: string;
  description: string;
  location: string;
  start: Date;
  durationMin: number;
}): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours(),
    )}${pad(d.getUTCMinutes())}00Z`;
  const esc = (s: string) => s.replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n");
  const end = new Date(opts.start.getTime() + opts.durationMin * 60000);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GroomOS//Booking//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${opts.start.getTime()}@groomos`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(opts.title)}`,
    `DESCRIPTION:${esc(opts.description)}`,
    `LOCATION:${esc(opts.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

type Done = {
  date: string;
  time: string;
  depositDue: number;
  depositPaid: boolean;
  serviceName: string;
  addons: { name: string; price: number }[];
  durationMin: number;
  petName: string;
  customerName: string;
};

/** Normalised booking payload the flow hands to whichever backend is wired in. */
export type PublicBookingSubmit = {
  serviceId: string;
  startISO: string;
  size: DogSize;
  coat: CoatCondition;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  petName: string;
  breed: string;
  /** Set in charge mode — the succeeded deposit PaymentIntent to confirm against. */
  paymentIntentId?: string;
  /** Labels of the declarations the client ticked (server re-validates + snapshots). */
  declarations?: string[];
  /** Client's typed full name as their T&Cs e-signature (when terms exist). */
  termsSignedName?: string;
  /** Selected matting-scale level id (when the matting scale is enabled). */
  mattingLevelId?: string;
  /** Selected temperament-scale level id (when the temperament scale is enabled). */
  temperamentLevelId?: string;
  /** Selected add-on service ids (server re-prices + snapshots them). */
  addonIds?: string[];
};
export type PublicBookingResult =
  | { ok: true; depositDue: number; depositPaid?: boolean }
  | { ok: false; error?: string; message?: string };

/**
 * The whole booking flow. Its two side-effects — loading free slots and
 * submitting the booking — are injectable so the identical UI powers both the
 * real page (/book/[slug], the public API routes) and the mock demo (/book,
 * the in-memory store). Omit the callbacks to get the real-API defaults.
 */
export function PublicBooking({
  business,
  services,
  settings,
  deposit,
  fetchSlots,
  submitBooking,
}: {
  business: Business;
  services: Service[];
  settings: Settings;
  deposit?: PublicDepositConfig;
  fetchSlots?: (date: string, minutes: number) => Promise<string[]>;
  submitBooking?: (input: PublicBookingSubmit) => Promise<PublicBookingResult>;
}) {
  const mainServices = useMemo(() => services.filter((s) => s.active && !s.isAddon), [services]);
  const addOns = useMemo(() => services.filter((s) => s.active && s.isAddon), [services]);
  const slug = business.slug ?? "";
  const days = useMemo(() => nextDays(14), []);
  const address = [business.addressLine, business.city, business.postcode]
    .filter(Boolean)
    .join(", ");

  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState(mainServices[0]?.id ?? "");
  const [size, setSize] = useState<DogSize>("medium");
  const [date, setDate] = useState(days[0]);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [petName, setPetName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  // Declarations + T&Cs + scales ("checks" step)
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [signName, setSignName] = useState("");
  const [mattingLevelId, setMattingLevelId] = useState("");
  const [temperamentLevelId, setTemperamentLevelId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);

  const service = mainServices.find((s) => s.id === serviceId);
  // Coat is assessed by the groomer in person; the customer estimate assumes a
  // brushed coat. Size only changes the quote for giant breeds.
  const quote = service ? computeQuote(service, size, "smooth", settings, petName.trim() || "your dog") : null;
  const selectedAddons = addOns.filter((a) => addonIds.includes(a.id));
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.priceGBP, 0);
  const addonsMinutes = selectedAddons.reduce((sum, a) => sum + a.durationMin, 0);
  const groomMinutes = (quote?.totalDurationMin ?? service?.durationMin ?? 60) + addonsMinutes;
  const estTotal = (quote?.totalPriceGBP ?? service?.priceGBP ?? 0) + addonsTotal;
  // Deposit behaviour comes from the server (settings + connected account). When
  // omitted (older callers), fall back to a recorded deposit from settings.
  const depositCfg: PublicDepositConfig = deposit ?? {
    mode: settings.depositEnabled && settings.depositAmount > 0 ? "recorded" : "off",
    amount: settings.depositEnabled ? settings.depositAmount : 0,
  };
  const depositDue = depositCfg.mode === "off" ? 0 : depositCfg.amount;

  // Declarations + T&Cs the groomer configured. The "checks" step only exists
  // when there's something to agree to; step numbering is derived from this.
  const enabledDeclarations = useMemo(
    () => (settings.declarations ?? []).filter((d) => d.enabled && d.label.trim()),
    [settings.declarations],
  );
  const termsText = (settings.termsText ?? "").trim();
  const mattingScale = settings.mattingScale?.enabled ? settings.mattingScale : undefined;
  const temperamentScale = settings.temperamentScale?.enabled ? settings.temperamentScale : undefined;
  const mattingSel = mattingScale?.levels.find((l) => l.id === mattingLevelId);
  const temperamentSel = temperamentScale?.levels.find((l) => l.id === temperamentLevelId);
  const mattingOk = !mattingScale || (!!mattingSel && mattingSel.accepted);
  const temperamentOk = !temperamentScale || (!!temperamentSel && temperamentSel.accepted);
  const hasChecks =
    enabledDeclarations.length > 0 || termsText.length > 0 || !!mattingScale || !!temperamentScale;
  const activeSteps = useMemo<Exclude<Step, "done">[]>(
    () => ["service", "when", "details", ...(hasChecks ? (["checks"] as const) : []), "deposit"],
    [hasChecks],
  );
  const totalSteps = activeSteps.length;
  const stepNumber = (s: Exclude<Step, "done">) => activeSteps.indexOf(s) + 1;
  const allDeclarationsChecked = enabledDeclarations.every((d) => agreed[d.id]);

  // Resolve the two side-effects: injected callbacks (demo) or the real public
  // API routes (default). Memoised so the availability effect stays stable.
  const loadSlots = useMemo<(date: string, minutes: number) => Promise<string[]>>(
    () =>
      fetchSlots ??
      (async (d, minutes) => {
        if (!slug) return [];
        const r = await fetch(
          `/api/public/availability?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(
            d,
          )}&minutes=${minutes}`,
        );
        const j = await r.json().catch(() => null);
        return Array.isArray(j?.slots) ? j.slots : [];
      }),
    [fetchSlots, slug],
  );
  const sendBooking = useMemo<(input: PublicBookingSubmit) => Promise<PublicBookingResult>>(
    () =>
      submitBooking ??
      (async (input) => {
        const res = await fetch("/api/public/booking", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, ...input }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) return { ok: false, error: data?.error, message: data?.message };
        return { ok: true, depositDue: Number(data.depositDue) || 0, depositPaid: Boolean(data.depositPaid) };
      }),
    [submitBooking, slug],
  );

  // Fetch free slots whenever the day or groom length changes.
  useEffect(() => {
    let active = true;
    setSlotsLoading(true);
    loadSlots(date, groomMinutes)
      .then((s) => {
        if (!active) return;
        setSlots(s);
        setSlotsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSlots([]);
        setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadSlots, date, groomMinutes, refresh]);

  // While browsing the day/time step, drop a chosen time that's no longer
  // offered (new day, longer groom, just taken). Once the visitor has moved on
  // we keep their choice — the server re-validates it at confirm time.
  useEffect(() => {
    if (step === "when" && time && !slots.includes(time)) setTime("");
  }, [slots, time, step]);

  function goBack() {
    setErrors({});
    if (step === "when") setStep("service");
    else if (step === "details") setStep("when");
    else if (step === "checks") setStep("details");
    else if (step === "deposit") setStep(hasChecks ? "checks" : "details");
  }

  function chooseService(id: string) {
    setServiceId(id);
    setTime("");
    // With add-ons available, stay here to offer extras; otherwise go straight on.
    if (addOns.length === 0) setStep("when");
  }

  function goToWhen() {
    setTime("");
    setStep("when");
  }

  function toggleAddon(id: string) {
    setAddonIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function chooseTime(s: string) {
    setTime(s);
    setErrors((x) => ({ ...x, time: "" }));
    setStep("details");
  }

  function submitDetails() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please tell us your name";
    if (!phone.trim()) next.phone = "We need a number to confirm";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email";
    if (!petName.trim()) next.petName = "Your dog's name, please";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (hasChecks) {
      setSignName((prev) => prev || name.trim()); // pre-fill the signature with their name
      setStep("checks");
    } else {
      setStep("deposit");
    }
  }

  // Gate to the deposit/confirm step: every enabled declaration must be ticked
  // and (if the groomer has T&Cs) the terms agreed + signed.
  function submitChecks() {
    const next: Record<string, string> = {};
    if (mattingScale && !mattingSel) next.checks = "Please tell us how your dog's coat is.";
    else if (temperamentScale && !temperamentSel) next.checks = "Please tell us how your dog finds grooming.";
    else if (!mattingOk || !temperamentOk)
      next.checks = "That option can't be booked online — please contact the groomer directly (above).";
    else if (!allDeclarationsChecked) next.checks = "Please tick each confirmation to continue.";
    else if (termsText && !termsAgreed) next.checks = "Please agree to the terms to continue.";
    else if (termsText && !signName.trim()) next.sign = "Type your name to sign";
    setErrors(next);
    if (Object.keys(next).length === 0) setStep("deposit");
  }

  // In charge mode this runs only after the deposit card has been charged, with
  // the succeeded PaymentIntent id; the server verifies it before confirming.
  async function confirmBooking(paymentIntentId?: string) {
    if (!service || !time) return;
    const { firstName, lastName } = splitName(name);
    setSubmitting(true);
    setErrors({});
    try {
      const result = await sendBooking({
        serviceId,
        startISO: `${date}T${time}:00.000Z`,
        size,
        coat: "smooth",
        firstName,
        lastName,
        email: email.trim(),
        phone: phone.trim(),
        petName: petName.trim(),
        breed: "",
        paymentIntentId,
        declarations: enabledDeclarations.map((d) => d.label),
        termsSignedName: termsText ? signName.trim() : undefined,
        mattingLevelId: mattingScale ? mattingLevelId : undefined,
        temperamentLevelId: temperamentScale ? temperamentLevelId : undefined,
        addonIds: selectedAddons.map((a) => a.id),
      });
      if (!result.ok) {
        if (result.error === "slot_taken") {
          setTime("");
          setRefresh((n) => n + 1);
          setErrors({ time: result.message ?? "That time was just taken — please pick another." });
          setStep("when");
        } else {
          setErrors({ form: result.message ?? "Something went wrong — please try again." });
        }
        return;
      }
      setDone({
        date,
        time,
        depositDue: result.depositDue,
        depositPaid: result.depositPaid ?? false,
        serviceName: service.name,
        addons: selectedAddons.map((a) => ({ name: a.name, price: a.priceGBP })),
        durationMin: groomMinutes,
        petName: petName.trim(),
        customerName: name.trim(),
      });
      setStep("done");
    } catch {
      setErrors({ form: "Couldn't reach the server — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function bookAnother() {
    setDone(null);
    setTime("");
    setPetName("");
    setErrors({});
    setAgreed({});
    setTermsAgreed(false);
    setTermsExpanded(false);
    setSignName("");
    setMattingLevelId("");
    setTemperamentLevelId("");
    setAddonIds([]);
    setRefresh((n) => n + 1);
    setStep("service");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-DEFAULT bg-surface">
        <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
          <Logo />
          <Badge tone="neutral">Online booking</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-5 py-7">
        {/* Who they're booking with — always visible for trust. */}
        <div className="mb-6 flex items-center gap-3.5">
          <BusinessLogo
            name={business.name}
            logoUrl={business.logoUrl}
            className="h-12 w-12 text-lg"
          />
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight text-ink">{business.name}</p>
            {address && <p className="mt-0.5 text-sm text-ink-muted">{address}</p>}
          </div>
        </div>

        {mainServices.length === 0 ? (
          <div className="rounded-2xl border border-DEFAULT bg-surface px-6 py-12 text-center text-sm text-ink-muted shadow-card">
            {business.name} hasn&apos;t published any services yet. Please check back soon.
          </div>
        ) : step === "done" && done ? (
          <Confirmation
            done={done}
            business={business}
            address={address}
            onBookAnother={bookAnother}
          />
        ) : (
          <>
            {step !== "done" && (
              <StepHeader
                index={stepNumber(step as Exclude<Step, "done">)}
                total={totalSteps}
                title={STEP_TITLE[step]}
                onBack={step === "service" ? undefined : goBack}
              />
            )}

            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              {step === "service" && (
                <div className="flex flex-col gap-3">
                  {mainServices.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => chooseService(s.id)}
                      aria-pressed={serviceId === s.id}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors",
                        serviceId === s.id
                          ? "border-accent bg-accent-50"
                          : "border-strong bg-surface hover:border-accent",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-base font-semibold text-ink">{s.name}</span>
                        <span className="mt-0.5 block text-sm text-ink-muted">{s.durationMin} min</span>
                        {s.description && (
                          <span className="mt-1 block line-clamp-1 text-xs text-ink-subtle">{s.description}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="text-base font-semibold text-ink">{formatGBP(s.priceGBP)}</span>
                        {addOns.length === 0 && <ChevronRight className="h-5 w-5 text-ink-subtle" />}
                      </span>
                    </button>
                  ))}

                  {/* Add extras? — only when the groomer has add-ons */}
                  {addOns.length > 0 && service && (
                    <div className="mt-1 flex flex-col gap-4">
                      <div className="border-t border-DEFAULT pt-4">
                        <p className="text-sm font-medium text-ink">Add extras?</p>
                        <p className="mt-0.5 text-xs text-ink-muted">Optional — tap any you&apos;d like added to the groom.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {addOns.map((a) => {
                            const on = addonIds.includes(a.id);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => toggleAddon(a.id)}
                                aria-pressed={on}
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                                  on
                                    ? "border-accent bg-accent text-ink-inverse"
                                    : "border-strong bg-surface text-ink hover:border-accent",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border",
                                    on ? "border-ink-inverse/50" : "border-strong",
                                  )}
                                >
                                  {on && <Check className="h-2.5 w-2.5" />}
                                </span>
                                {a.name}
                                <span className={cn("tabular-nums", on ? "text-ink-inverse/90" : "text-ink-muted")}>
                                  +{formatGBP(a.priceGBP)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-DEFAULT bg-surface-sunken px-4 py-3">
                        <span className="text-sm text-ink-muted">
                          {service.name}
                          {selectedAddons.length > 0 && ` + ${selectedAddons.length} extra${selectedAddons.length > 1 ? "s" : ""}`}
                        </span>
                        <span className="text-base font-semibold text-ink">{formatGBP(estTotal)}</span>
                      </div>
                      <Button size="lg" className="h-12 w-full" onClick={goToWhen}>
                        Continue
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {step === "when" && (
                <div className="flex flex-col gap-5">
                  {/* Day picker — a scrollable row of big chips, no fiddly native picker. */}
                  <div>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {days.map((d, i) => {
                        const sel = d === date;
                        const dt = new Date(`${d}T12:00:00`);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setDate(d);
                              setTime("");
                            }}
                            aria-pressed={sel}
                            className={cn(
                              "flex min-w-[64px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition-colors",
                              sel
                                ? "border-accent bg-accent text-ink-inverse"
                                : "border-strong bg-surface text-ink hover:border-accent",
                            )}
                          >
                            <span className="text-[11px] font-medium opacity-80">
                              {i === 0 ? "Today" : dt.toLocaleDateString("en-GB", { weekday: "short" })}
                            </span>
                            <span className="text-lg font-semibold tabular-nums leading-tight">{dt.getDate()}</span>
                            <span className="text-[10px] opacity-80">
                              {dt.toLocaleDateString("en-GB", { month: "short" })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Times */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{dayLabel(date)}</span>
                      {!slotsLoading && slots.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
                          <Clock className="h-3 w-3" />
                          {groomMinutes} min · {slots.length} free
                        </span>
                      )}
                    </div>

                    {slotsLoading ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-sunken" />
                        ))}
                      </div>
                    ) : slots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => chooseTime(s)}
                            className={cn(
                              "tabular-nums h-12 rounded-xl border text-sm font-semibold transition-colors",
                              "border-strong bg-surface text-ink hover:border-accent hover:bg-accent-50 hover:text-accent-700",
                            )}
                          >
                            {slotLabel(s)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center rounded-2xl border border-dashed border-strong bg-surface-sunken px-4 py-8 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                          <CalendarX2 className="h-5 w-5" />
                        </span>
                        <p className="mt-3 text-sm font-medium text-ink">{dayLabel(date)} is fully booked</p>
                        <p className="mt-1 max-w-xs text-xs text-ink-muted">
                          No room for a {groomMinutes}-minute groom that day — please try another.
                        </p>
                      </div>
                    )}
                    {errors.time && <p className="text-xs text-danger">{errors.time}</p>}
                  </div>
                </div>
              )}

              {step === "details" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <span className="text-sm font-medium text-ink">How big is your dog?</span>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {SIZES.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSize(sz)}
                          aria-pressed={size === sz}
                          className={cn(
                            "h-12 rounded-xl border text-sm font-medium transition-colors",
                            size === sz
                              ? "border-accent bg-accent text-ink-inverse"
                              : "border-strong bg-surface text-ink hover:border-accent",
                          )}
                        >
                          {SIZE_LABEL[sz]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Your name"
                    className="h-12 text-base"
                    autoComplete="name"
                    enterKeyHint="next"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                  />
                  <Input
                    label="Mobile number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="next"
                    className="h-12 text-base"
                    placeholder="07…"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                  />
                  <Input
                    label="Email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    enterKeyHint="next"
                    className="h-12 text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                  />
                  <Input
                    label="Your dog's name"
                    className="h-12 text-base"
                    autoComplete="off"
                    enterKeyHint="done"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    error={errors.petName}
                  />

                  <Button size="lg" className="h-12 w-full" onClick={submitDetails}>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === "checks" && (
                <div className="flex flex-col gap-6">
                  {mattingScale && (
                    <ScaleMeter
                      scale={mattingScale}
                      businessName={business.name}
                      selectedId={mattingLevelId}
                      onSelect={setMattingLevelId}
                    />
                  )}
                  {temperamentScale && (
                    <ScaleMeter
                      scale={temperamentScale}
                      businessName={business.name}
                      selectedId={temperamentLevelId}
                      onSelect={setTemperamentLevelId}
                    />
                  )}
                  {enabledDeclarations.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-sm text-ink-muted">
                        Please confirm the following about {petName.trim() || "your dog"}:
                      </p>
                      {enabledDeclarations.map((d) => {
                        const on = !!agreed[d.id];
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setAgreed((a) => ({ ...a, [d.id]: !a[d.id] }))}
                            aria-pressed={on}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                              on ? "border-accent bg-accent-50" : "border-strong bg-surface hover:border-accent",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                                on ? "border-accent bg-accent text-ink-inverse" : "border-strong bg-surface",
                              )}
                            >
                              {on && <Check className="h-3.5 w-3.5" />}
                            </span>
                            <span className="text-sm leading-snug text-ink">{d.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {termsText && (
                    <div className="flex flex-col gap-2.5">
                      <p className="text-sm font-medium text-ink">
                        {business.name}&apos;s terms &amp; conditions
                      </p>
                      <div
                        className={cn(
                          "relative overflow-hidden rounded-2xl border border-DEFAULT bg-surface-sunken p-4 text-sm leading-relaxed text-ink-muted",
                          !termsExpanded && "max-h-32",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{termsText}</p>
                        {!termsExpanded && (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-sunken to-transparent" />
                        )}
                      </div>
                      {!termsExpanded && (
                        <button
                          type="button"
                          onClick={() => setTermsExpanded(true)}
                          className="self-start text-sm font-medium text-accent transition-colors hover:text-accent-600"
                        >
                          View full terms
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setTermsAgreed((v) => !v)}
                        aria-pressed={termsAgreed}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                          termsAgreed ? "border-accent bg-accent-50" : "border-strong bg-surface hover:border-accent",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                            termsAgreed ? "border-accent bg-accent text-ink-inverse" : "border-strong bg-surface",
                          )}
                        >
                          {termsAgreed && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="text-sm leading-snug text-ink">
                          I have read and agree to {business.name}&apos;s terms &amp; conditions.
                        </span>
                      </button>
                      <Input
                        label="Type your full name to sign"
                        className="h-12 text-base"
                        autoComplete="name"
                        value={signName}
                        onChange={(e) => setSignName(e.target.value)}
                        error={errors.sign}
                      />
                    </div>
                  )}

                  {errors.checks && <p className="text-sm text-danger">{errors.checks}</p>}

                  <Button size="lg" className="h-12 w-full" onClick={submitChecks}>
                    Continue
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === "deposit" && (
                <div className="flex flex-col gap-5">
                  {/* Booking summary */}
                  <div className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
                    <SummaryRow label="Groom" value={service?.name ?? ""} />
                    {selectedAddons.length > 0 && (
                      <SummaryRow
                        label="Extras"
                        value={selectedAddons.map((a) => a.name).join(", ")}
                      />
                    )}
                    <SummaryRow label="When" value={`${dayLabel(date)} · ${slotLabel(time)}`} />
                    <SummaryRow label="Dog" value={`${petName.trim()} · ${SIZE_LABEL[size]}`} />
                    <div className="mt-3 flex items-center justify-between border-t border-DEFAULT pt-3">
                      <span className="text-sm font-medium text-ink">Estimated total</span>
                      <span className="text-base font-semibold text-ink">{formatGBP(estTotal)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-subtle">
                      Final price is confirmed by {business.name} on the day, after they&apos;ve met your dog.
                    </p>
                  </div>

                  {depositCfg.mode !== "off" && depositDue > 0 && (
                    <div className="rounded-2xl border border-accent/20 bg-accent-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700">
                          <ShieldCheck className="h-4 w-4" /> Deposit
                        </span>
                        <span className="text-lg font-semibold text-accent-700">{formatGBP(depositDue)}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-accent-700">
                        {depositCfg.mode === "charge" ? "Paid now to secure your slot" : "Secures your slot"} and
                        comes off your total — you&apos;ll pay{" "}
                        {formatGBP(Math.max(estTotal - depositDue, 0))} to {business.name} on the day.
                      </p>
                    </div>
                  )}

                  {errors.form && <p className="text-sm text-danger">{errors.form}</p>}

                  {depositCfg.mode === "charge" && depositDue > 0 ? (
                    <ChargeDeposit
                      slug={slug}
                      serviceId={serviceId}
                      deposit={depositCfg}
                      submitting={submitting}
                      onPaid={(pi) => confirmBooking(pi)}
                    />
                  ) : (
                    <Button
                      size="lg"
                      className="h-12 w-full"
                      onClick={() => confirmBooking()}
                      loading={submitting}
                      disabled={submitting}
                    >
                      <Check className="h-4 w-4" />
                      Confirm booking
                    </Button>
                  )}
                  <p className="-mt-2 text-center text-xs text-ink-subtle">
                    No account needed{settings.cancellationNoticeHours ? ` · free to cancel up to ${settings.cancellationNoticeHours}h before` : ""}.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </main>

      <footer className="mx-auto max-w-xl px-5 pb-8 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-ink-subtle">
          <span>Powered by GroomOS</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3 w-3" /> Payments powered by Stripe
          </span>
          <span aria-hidden>·</span>
          <a href="/privacy" className="transition-colors hover:text-ink">Privacy</a>
          <a href="/terms" className="transition-colors hover:text-ink">Terms</a>
        </div>
      </footer>
    </div>
  );
}

/** Step counter + progress bar + back button + title. */
function StepHeader({
  index,
  total,
  title,
  onBack,
}: {
  index: number;
  total: number;
  title: string;
  onBack?: () => void;
}) {
  return (
    <div className="mb-5">
      <div className="flex h-9 items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <span className="text-xs font-medium text-ink-subtle">Step {index} of {total}</span>
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-accent" : "bg-surface-sunken")}
          />
        ))}
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">{title}</h1>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="shrink-0 text-sm text-ink-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

/**
 * A calm, tappable "meter" for a declaration scale (matting / temperament):
 * a soft gradient track with one tappable point per level. Only the *selected*
 * level's label + description is shown, so it reads as a few seconds of light
 * tapping rather than a wall of cards. Plain buttons (no drag/slider), so it
 * can't jank. A level the groomer doesn't accept turns red and shows a kind
 * "contact us" note; the parent's gate stops the booking from completing.
 */
function ScaleMeter({
  scale,
  businessName,
  selectedId,
  onSelect,
}: {
  scale: DeclarationScale;
  businessName: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = scale.levels.find((l) => l.id === selectedId);
  const blocked = selected && !selected.accepted;
  const first = scale.levels[0];
  const last = scale.levels[scale.levels.length - 1];
  return (
    <div className="rounded-2xl border border-DEFAULT bg-surface p-5 shadow-card">
      <p className="text-[15px] font-semibold text-ink">{scale.title}</p>

      {/* Gradient track + evenly-spaced tappable points */}
      <div className="relative mt-6 mb-2.5">
        <div className="absolute inset-x-[22px] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#9CC3A6] via-[#EAC08A] to-[#D98B7D]" />
        <div className="relative flex justify-between">
          {scale.levels.map((l) => {
            const on = l.id === selectedId;
            const bad = on && !l.accepted;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelect(l.id)}
                aria-pressed={on}
                aria-label={l.label}
                className="flex h-11 w-11 items-center justify-center"
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 bg-surface transition-all duration-150",
                    on ? "h-6 w-6 shadow-sm" : "h-3.5 w-3.5",
                    bad ? "border-danger" : on ? "border-accent" : "border-strong",
                  )}
                >
                  {on && (
                    <span className={cn("h-2.5 w-2.5 rounded-full", bad ? "bg-danger" : "bg-accent")} />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* End anchors for orientation */}
      <div className="flex justify-between gap-3 px-0.5 text-[11px] text-ink-subtle">
        <span className="max-w-[45%] truncate">{first?.label}</span>
        <span className="max-w-[45%] truncate text-right">{last?.label}</span>
      </div>

      {/* Only the selected level's detail is shown */}
      <div className="mt-4 rounded-xl bg-surface-sunken p-3.5">
        {selected ? (
          <>
            <p className={cn("text-sm font-semibold", blocked ? "text-danger" : "text-ink")}>
              {selected.label}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-ink-muted">{selected.description}</p>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Tap the scale above to tell us how your dog is.</p>
        )}
      </div>

      {blocked && (
        <p className="mt-2.5 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          <span className="font-medium">{selected!.label}</span> — please contact {businessName} directly
          before booking online.
        </p>
      )}
    </div>
  );
}

/** The final confirmation: everything the owner needs + add to calendar. */
function Confirmation({
  done,
  business,
  address,
  onBookAnother,
}: {
  done: Done;
  business: Business;
  address: string;
  onBookAnother: () => void;
}) {
  const start = new Date(`${done.date}T${done.time}:00.000Z`);
  const cal = icsHref({
    title: `${done.serviceName} — ${done.petName} at ${business.name}`,
    description: `Grooming appointment for ${done.petName} with ${business.name}.${
      done.depositDue > 0 ? ` A ${formatGBP(done.depositDue)} deposit secures the slot.` : ""
    }`,
    location: address,
    start,
    durationMin: done.durationMin,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: EASE }}>
      <div className="rounded-3xl border border-DEFAULT bg-surface p-7 shadow-card">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success-deep ring-8 ring-success-soft/40">
            <CalendarCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-[22px] font-semibold tracking-tight text-ink">Booking request sent</h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            Thanks {done.customerName.split(/\s+/)[0]}! {business.name} will confirm {done.petName}&apos;s
            groom shortly — keep an eye on your phone.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-1 rounded-2xl bg-surface-sunken p-4">
          <SummaryRow label="Groom" value={done.serviceName} />
          {done.addons.length > 0 && (
            <SummaryRow label="Extras" value={done.addons.map((a) => a.name).join(", ")} />
          )}
          <SummaryRow label="When" value={`${dayLabel(done.date)} · ${slotLabel(done.time)}`} />
          <SummaryRow label="Dog" value={done.petName} />
          {done.depositDue > 0 && (
            <SummaryRow
              label="Deposit"
              value={done.depositPaid ? `${formatGBP(done.depositDue)} paid ✓` : `${formatGBP(done.depositDue)} secures your slot`}
            />
          )}
          <div className="mt-2 flex items-start gap-2 border-t border-DEFAULT pt-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" />
            <div>
              <p className="text-sm font-medium text-ink">{business.name}</p>
              {address && <p className="text-sm text-ink-muted">{address}</p>}
            </div>
          </div>
        </div>

        <a
          href={cal}
          download="groom-appointment.ics"
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-strong bg-surface text-sm font-medium text-ink shadow-xs transition-colors hover:bg-surface-sunken"
        >
          <CalendarPlus className="h-4 w-4" />
          Add to calendar
        </a>
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onBookAnother}
            className="h-9 rounded-lg px-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Book another groom
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/** Brand-matched look for Stripe's hosted card fields. */
const STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#C9756B",
    borderRadius: "12px",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  },
};

/**
 * Charge-mode deposit. Fetches a PaymentIntent on the business's connected
 * account, mounts Stripe's card element, and only hands the succeeded
 * PaymentIntent back to the parent — which then creates the booking. If the
 * card fails, no booking is made.
 */
function ChargeDeposit({
  slug,
  serviceId,
  deposit,
  submitting,
  onPaid,
}: {
  slug: string;
  serviceId: string;
  deposit: PublicDepositConfig;
  submitting: boolean;
  onPaid: (paymentIntentId: string) => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo(
    () =>
      deposit.publishableKey
        ? loadStripe(deposit.publishableKey, { stripeAccount: deposit.connectedAccountId })
        : null,
    [deposit.publishableKey, deposit.connectedAccountId],
  );

  useEffect(() => {
    let active = true;
    setClientSecret(null);
    setError(null);
    fetch("/api/public/booking/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, serviceId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d?.ok && d.clientSecret) setClientSecret(d.clientSecret as string);
        else setError("We couldn't start the payment — please try again in a moment.");
      })
      .catch(() => {
        if (active) setError("We couldn't reach the payment service — please try again.");
      });
    return () => {
      active = false;
    };
  }, [slug, serviceId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
        {error}
      </div>
    );
  }
  if (!clientSecret || !stripePromise) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-DEFAULT bg-surface text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
      <DepositPayForm amount={deposit.amount} submitting={submitting} onPaid={onPaid} />
    </Elements>
  );
}

/** The pay button inside the Stripe Elements context (needs useStripe/useElements). */
function DepositPayForm({
  amount,
  submitting,
  onPaid,
}: {
  amount: number;
  submitting: boolean;
  onPaid: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (err) {
      setError(err.message ?? "Your payment couldn't be completed — please try again.");
      setPaying(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Keep the button busy — the parent now creates the booking.
      onPaid(paymentIntent.id);
      return;
    }
    setError("Your payment didn't complete — please try again.");
    setPaying(false);
  }

  const busy = paying || submitting;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-DEFAULT bg-surface p-4">
        <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        size="lg"
        className="h-12 w-full"
        onClick={pay}
        loading={busy}
        disabled={busy || !stripe || !ready}
      >
        <Lock className="h-4 w-4" />
        Pay {formatGBP(amount)} &amp; confirm
      </Button>
      <p className="-mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-ink-subtle">
        <Lock className="h-3 w-3" /> Secured by Stripe · your deposit goes straight to the groomer.
      </p>
    </div>
  );
}
