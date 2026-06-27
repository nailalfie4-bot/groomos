"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CalendarX2, Check, Clock, PawPrint, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QuoteBreakdown } from "@/components/booking-form";
import { useStore } from "@/lib/mock/store";
import { addDays, formatGBP } from "@/lib/format";
import { availableSlots, findClash, nextAvailableDay } from "@/lib/schedule";
import { COAT_HELP, COAT_LABEL, SIZE_LABEL } from "@/lib/pricing";
import type { CoatCondition, DogSize } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Friendly 12-hour chip label: "13:00" → "1:00", "09:00" → "9:00". */
function slotLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")}`;
}

/** Short, warm day label, e.g. "Tue 30 Jun". */
function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function PublicBookingPage() {
  const {
    business,
    services,
    clients,
    appointments,
    settings,
    hydrated,
    getPetsForClient,
    addClient,
    addPet,
    createAppointment,
    quoteFor,
  } = useStore();
  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services],
  );

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
  const [done, setDone] = useState<null | { time: string; date: string }>(null);

  const service = activeServices.find((s) => s.id === serviceId);
  const quote = quoteFor(serviceId, size, coat, petName.trim() || "your dog");

  // How long the chosen groom actually takes (incl. matting/size time) — this
  // is what we fit into the day, so longer grooms naturally show fewer slots.
  const groomMinutes = quote?.totalDurationMin ?? service?.durationMin ?? 60;
  const selectedDay = useMemo(() => new Date(`${date}T00:00:00`), [date]);

  // Only the genuinely free start times for the chosen day + service. Gated on
  // `hydrated` so server and first client render agree (no hydration flash),
  // and so it reflects any bookings restored from storage.
  const slots = useMemo(
    () =>
      hydrated
        ? availableSlots(appointments, settings, business, selectedDay, groomMinutes)
        : [],
    [hydrated, appointments, settings, business, selectedDay, groomMinutes],
  );

  // When the day is full, find the next one the client can actually book.
  const nextDay = useMemo(() => {
    if (!hydrated || slots.length > 0) return null;
    return nextAvailableDay(
      appointments,
      settings,
      business,
      addDays(selectedDay, 1),
      groomMinutes,
    );
  }, [hydrated, slots.length, appointments, settings, business, selectedDay, groomMinutes]);

  // Land the client on the soonest bookable day instead of a full one (once).
  const didInit = useRef(false);
  useEffect(() => {
    if (!hydrated || didInit.current) return;
    didInit.current = true;
    const today = new Date();
    if (availableSlots(appointments, settings, business, today, groomMinutes).length === 0) {
      const next = nextAvailableDay(appointments, settings, business, today, groomMinutes);
      if (next) setDate(toDateValue(next));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Drop a chosen time if a longer groom or a new day makes it unavailable.
  useEffect(() => {
    if (time && !slots.includes(time)) setTime("");
  }, [slots, time]);

  function submit() {
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

    // Reuse an existing client by email, else create one — same logic a real
    // backend would apply on the public endpoint.
    const existing = clients.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase(),
    );
    const client =
      existing ??
      addClient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

    const pets = getPetsForClient(client.id);
    const pet =
      pets.find((p) => p.name.toLowerCase() === petName.trim().toLowerCase()) ??
      addPet({
        clientId: client.id,
        name: petName.trim(),
        breed: breed.trim() || "Unknown",
        size,
        notes: "",
      });

    const start = new Date(`${date}T${time}`);
    // Safety net: never let a public booking overlap (incl. cleanup buffer).
    if (
      quote &&
      findClash(appointments, settings, start.toISOString(), quote.totalDurationMin)
    ) {
      setErrors({ time: "Sorry, that time was just taken — please pick another." });
      return;
    }
    createAppointment({
      clientId: client.id,
      petId: pet.id,
      serviceId,
      start: start.toISOString(),
      source: "online",
      status: "pending",
      coatCondition: coat,
      size,
    });
    setDone({ time, date });
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
                  Thanks {firstName}! We&apos;ve asked {business.name} to groom{" "}
                  {petName} on {done.date} at {done.time}. You&apos;ll get a
                  confirmation once they accept.
                </p>
                <Button
                  className="mt-6"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDone(null);
                    setTime("");
                    setPetName("");
                    setBreed("");
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
              <p className="mt-2 text-sm text-ink-muted">
                {business.addressLine}, {business.city} · {business.postcode}
              </p>
            </div>

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
                {service && (
                  <p className="-mt-2 text-xs text-ink-muted">
                    {service.description}
                  </p>
                )}

                {/* Matting meter — helps us set aside the right time for your dog */}
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
                    {hydrated && slots.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
                        <Clock className="h-3 w-3" />
                        {groomMinutes} min · {slots.length} free
                      </span>
                    )}
                  </div>

                  {!hydrated ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-11 animate-pulse rounded-xl bg-surface-sunken"
                        />
                      ))}
                    </div>
                  ) : slots.length > 0 ? (
                    <>
                      <p className="text-xs text-ink-muted">
                        Free slots for {dayLabel(selectedDay)} — tap one to book it.
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
                        {dayLabel(selectedDay)} is fully booked
                      </p>
                      <p className="mt-1 max-w-xs text-xs text-ink-muted">
                        No room for a {groomMinutes}-minute groom that day — every booking
                        keeps cleanup time so no dog is ever rushed.
                      </p>
                      {nextDay ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            setDate(toDateValue(nextDay));
                            setTime("");
                            setErrors((x) => ({ ...x, time: "" }));
                          }}
                        >
                          <Sparkles className="h-4 w-4" />
                          Try {dayLabel(nextDay)}
                        </Button>
                      ) : (
                        <p className="mt-3 text-xs text-ink-subtle">
                          Nothing free in the next few weeks — please get in touch.
                        </p>
                      )}
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

                <Button onClick={submit}>
                  <Check className="h-4 w-4" />
                  Request booking
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
