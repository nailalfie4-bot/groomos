"use client";

/**
 * Public booking form for one business (real Supabase data, injected by the
 * /book/<slug> server component). Availability comes from the server route
 * (/api/public/availability) so private appointments never reach the browser;
 * submitting posts to /api/public/booking. Slot times are UTC wall-clock to
 * stay perfectly in step with the server.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CalendarX2, Check, Clock, PawPrint, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QuoteBreakdown } from "@/components/booking-form";
import { formatGBP } from "@/lib/format";
import { computeQuote, COAT_HELP, COAT_LABEL, SIZE_LABEL } from "@/lib/pricing";
import type { Business, CoatCondition, DogSize, Service, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** "13:00" → "1:00 pm" style friendly label. */
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

export function PublicBooking({
  business,
  services,
  settings,
}: {
  business: Business;
  services: Service[];
  settings: Settings;
}) {
  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const slug = business.slug ?? "";

  const [serviceId, setServiceId] = useState(activeServices[0]?.id ?? "");
  const [date, setDate] = useState(toDateValue(new Date()));
  const [time, setTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<DogSize>("medium");
  const [coat, setCoat] = useState<CoatCondition>("smooth");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | { time: string; date: string; depositDue: number }>(null);

  const service = activeServices.find((s) => s.id === serviceId);
  const quote = service
    ? computeQuote(service, size, coat, settings, petName.trim() || "your dog")
    : null;
  const groomMinutes = quote?.totalDurationMin ?? service?.durationMin ?? 60;
  const depositDue = settings.depositEnabled ? settings.depositAmount : 0;

  // Fetch free slots from the server whenever the day or groom length changes.
  useEffect(() => {
    let active = true;
    setSlotsLoading(true);
    const url = `/api/public/availability?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(
      date,
    )}&minutes=${groomMinutes}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setSlots(Array.isArray(d?.slots) ? d.slots : []);
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
  }, [slug, date, groomMinutes, refresh]);

  // Drop a chosen time if it's no longer offered (longer groom, new day, taken).
  useEffect(() => {
    if (time && !slots.includes(time)) setTime("");
  }, [slots, time]);

  async function submit() {
    const next: Record<string, string> = {};
    if (!serviceId) next.service = "Pick a service";
    if (!time) next.time = "Pick a time";
    if (!firstName.trim()) next.firstName = "Required";
    if (!lastName.trim()) next.lastName = "Required";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email";
    if (!phone.trim()) next.phone = "Required";
    if (!petName.trim()) next.petName = "Required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId,
          startISO: `${date}T${time}:00.000Z`,
          size,
          coat,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          petName: petName.trim(),
          breed: breed.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (data?.error === "slot_taken") {
          setErrors({ time: data.message ?? "That time was just taken — please pick another." });
          setTime("");
          setRefresh((n) => n + 1); // pull fresh availability
        } else {
          setErrors({ form: data?.message ?? "Something went wrong — please try again." });
        }
        return;
      }
      setDone({ time, date, depositDue: Number(data.depositDue) || 0 });
    } catch {
      setErrors({ form: "Couldn't reach the server — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-DEFAULT bg-surface">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo />
          <Badge tone="neutral">Online booking</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card>
              <CardContent className="flex flex-col items-center px-6 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                  <CalendarCheck className="h-6 w-6" />
                </span>
                <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                  Booking request sent
                </h1>
                <p className="mt-2 max-w-sm text-sm text-ink-muted">
                  Thanks {firstName}! We&apos;ve asked {business.name} to groom {petName} on{" "}
                  {dayLabel(done.date)} at {slotLabel(done.time)}. You&apos;ll get a confirmation
                  once they accept.
                </p>
                {done.depositDue > 0 && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    A {formatGBP(done.depositDue)} deposit secures your slot.
                  </p>
                )}
                <Button
                  className="mt-6"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDone(null);
                    setTime("");
                    setPetName("");
                    setBreed("");
                    setRefresh((n) => n + 1);
                  }}
                >
                  Book another
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <div className="mb-6">
              <Badge tone="accent" className="mb-3">
                <PawPrint className="h-3.5 w-3.5" />
                {business.name}
              </Badge>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">
                Book your dog&apos;s groom
              </h1>
              {(business.addressLine || business.city || business.postcode) && (
                <p className="mt-2 text-sm text-ink-muted">
                  {[business.addressLine, business.city, business.postcode].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            {activeServices.length === 0 ? (
              <Card>
                <CardContent className="px-6 py-12 text-center text-sm text-ink-muted">
                  {business.name} hasn&apos;t published any services yet. Please check back soon.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col gap-5 pt-6">
                  <Select
                    label="Service"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    error={errors.service}
                  >
                    {activeServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.durationMin}m · {formatGBP(s.priceGBP)}
                      </option>
                    ))}
                  </Select>
                  {service?.description && (
                    <p className="-mt-2 text-xs text-ink-muted">{service.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Your dog's size"
                      value={size}
                      onChange={(e) => setSize(e.target.value as DogSize)}
                    >
                      {(["small", "medium", "large", "giant"] as const).map((s) => (
                        <option key={s} value={s}>
                          {SIZE_LABEL[s]}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Coat condition"
                      value={coat}
                      onChange={(e) => setCoat(e.target.value as CoatCondition)}
                    >
                      {(["smooth", "tangled", "matted"] as const).map((c) => (
                        <option key={c} value={c}>
                          {COAT_LABEL[c]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <p className="-mt-2 text-xs text-ink-subtle">{COAT_HELP[coat]}</p>

                  {quote && (
                    <QuoteBreakdown
                      base={quote.basePriceGBP}
                      baseMin={quote.baseDurationMin}
                      mattingFee={quote.mattingFee}
                      sizeFee={quote.sizeFee}
                      total={quote.totalPriceGBP}
                      totalMin={quote.totalDurationMin}
                      reason={quote.reason}
                    />
                  )}

                  {depositDue > 0 && (
                    <p className="inline-flex items-center gap-1.5 rounded-lg bg-accent-50 px-3 py-2 text-xs font-medium text-accent-700">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      A {formatGBP(depositDue)} deposit secures your slot and comes off the total.
                    </p>
                  )}

                  <Input
                    label="Date"
                    type="date"
                    value={date}
                    min={toDateValue(new Date())}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime("");
                      setErrors((x) => ({ ...x, time: "" }));
                    }}
                  />

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">Pick a time</span>
                      {!slotsLoading && slots.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
                          <Clock className="h-3 w-3" />
                          {groomMinutes} min · {slots.length} free
                        </span>
                      )}
                    </div>

                    {slotsLoading ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-11 animate-pulse rounded-xl bg-surface-sunken" />
                        ))}
                      </div>
                    ) : slots.length > 0 ? (
                      <>
                        <p className="text-xs text-ink-muted">
                          Free slots for {dayLabel(date)} — tap one to book it.
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {slots.map((s) => {
                            const selected = time === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => {
                                  setTime(s);
                                  setErrors((x) => ({ ...x, time: "" }));
                                }}
                                className={cn(
                                  "tabular-nums rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors duration-fast",
                                  selected
                                    ? "border-accent bg-accent text-ink-inverse shadow-sm"
                                    : "border-strong bg-surface text-ink hover:border-accent hover:bg-accent-50 hover:text-accent-700",
                                )}
                              >
                                {slotLabel(s)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center rounded-xl border border-dashed border-strong bg-surface-sunken px-4 py-6 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                          <CalendarX2 className="h-5 w-5" />
                        </span>
                        <p className="mt-3 text-sm font-medium text-ink">
                          {dayLabel(date)} is fully booked
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-ink-muted">
                          No room for a {groomMinutes}-minute groom that day — please try another date.
                        </p>
                      </div>
                    )}

                    {errors.time && <p className="text-xs text-danger">{errors.time}</p>}
                  </div>

                  <div className="border-t border-DEFAULT pt-5">
                    <p className="mb-3 text-sm font-medium text-ink">Your details</p>
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="First name"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          error={errors.firstName}
                        />
                        <Input
                          label="Last name"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          error={errors.lastName}
                        />
                      </div>
                      <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={errors.email}
                      />
                      <Input
                        label="Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        error={errors.phone}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Dog's name"
                          value={petName}
                          onChange={(e) => setPetName(e.target.value)}
                          error={errors.petName}
                        />
                        <Input
                          label="Breed"
                          placeholder="e.g. Cockapoo"
                          value={breed}
                          onChange={(e) => setBreed(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {errors.form && <p className="text-sm text-danger">{errors.form}</p>}

                  <Button onClick={submit} loading={submitting} disabled={submitting}>
                    <Check className="h-4 w-4" />
                    Request booking
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
