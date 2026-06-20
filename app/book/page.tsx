"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Check, PawPrint } from "lucide-react";
import { Logo } from "@/components/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/mock/store";
import { formatGBP } from "@/lib/format";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function PublicBookingPage() {
  const {
    business,
    services,
    clients,
    getPetsForClient,
    addClient,
    addPet,
    createAppointment,
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<null | { time: string; date: string }>(null);

  // 30-minute slots across the salon's opening hours.
  const slots = useMemo(() => {
    const out: string[] = [];
    for (let h = business.openHour; h < business.closeHour; h++) {
      out.push(`${String(h).padStart(2, "0")}:00`);
      out.push(`${String(h).padStart(2, "0")}:30`);
    }
    return out;
  }, [business.openHour, business.closeHour]);

  const service = activeServices.find((s) => s.id === serviceId);

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
        size: "medium",
        notes: "",
      });

    const start = new Date(`${date}T${time}`);
    createAppointment({
      clientId: client.id,
      petId: pet.id,
      serviceId,
      start: start.toISOString(),
      source: "online",
      status: "pending",
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

                <Input
                  label="Date"
                  type="date"
                  value={date}
                  min={toDateValue(new Date())}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime("");
                  }}
                />

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink">Time</span>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setTime(s)}
                        className={cn(
                          "tabular-nums rounded-lg border px-2 py-2 text-sm transition-colors duration-fast",
                          time === s
                            ? "border-accent bg-accent-50 font-medium text-accent-700"
                            : "border-strong bg-surface text-ink-muted hover:border-accent/40 hover:text-ink",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {errors.time && (
                    <p className="text-xs text-danger">{errors.time}</p>
                  )}
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
