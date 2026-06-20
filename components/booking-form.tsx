"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Heart } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/mock/store";
import { formatGBP } from "@/lib/format";
import { findClash } from "@/lib/schedule";
import { COAT_HELP, COAT_LABEL, SIZE_LABEL } from "@/lib/pricing";
import type { CoatCondition, DogSize } from "@/lib/types";

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function toTimeValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function BookingForm({
  open,
  onClose,
  defaultStart,
}: {
  open: boolean;
  onClose: () => void;
  /** Optional ISO datetime to pre-fill (e.g. a clicked calendar slot). */
  defaultStart?: string;
}) {
  const {
    clients,
    pets,
    services,
    appointments,
    settings,
    createAppointment,
    getPetsForClient,
    quoteFor,
  } = useStore();
  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services],
  );

  const initialDate = defaultStart ? new Date(defaultStart) : new Date();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState(activeServices[0]?.id ?? "");
  const [size, setSize] = useState<DogSize>("medium");
  const [coat, setCoat] = useState<CoatCondition>("smooth");
  const [date, setDate] = useState(toDateValue(initialDate));
  const [time, setTime] = useState(
    defaultStart ? toTimeValue(initialDate) : "09:00",
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientPets = clientId ? getPetsForClient(clientId) : [];
  const effectivePetId =
    clientPets.find((p) => p.id === petId)?.id ?? clientPets[0]?.id ?? "";
  const pet = pets.find((p) => p.id === effectivePetId);

  // Default the size to the pet's recorded size whenever the pet changes.
  useEffect(() => {
    if (pet) setSize(pet.size);
  }, [pet]);

  const quote = useMemo(
    () => quoteFor(serviceId, size, coat, pet?.name),
    [quoteFor, serviceId, size, coat, pet?.name],
  );

  function submit() {
    setError(null);
    if (!clientId || !effectivePetId || !serviceId) {
      setError("Pick a client, pet and service to book.");
      return;
    }
    const start = new Date(`${date}T${time}`);
    // Never let the groomer double-book themselves (incl. cleanup buffer).
    const clash = quote
      ? findClash(appointments, settings, start.toISOString(), quote.totalDurationMin)
      : null;
    if (clash) {
      setError("That time clashes with another dog (including cleanup time). Pick another slot.");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      try {
        createAppointment({
          clientId,
          petId: effectivePetId,
          serviceId,
          start: start.toISOString(),
          source: "staff",
          status: "confirmed",
          coatCondition: coat,
          size,
          notes,
        });
        toast.success("Appointment booked", {
          description: `${pet?.name ?? "Pet"} · ${date} ${time}`,
        });
        setSaving(false);
        setNotes("");
        onClose();
      } catch {
        setSaving(false);
        setError("Could not create the appointment. Try again.");
      }
    }, 450);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New appointment"
      description="Book a slot — pricing and time adjust for size and coat."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={saving} onClick={submit}>
            {!saving && <Check className="h-4 w-4" />}
            Book {quote ? formatGBP(quote.totalPriceGBP) : ""}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <Select
          label="Client"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setPetId("");
          }}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </Select>

        <Select
          label="Pet"
          value={effectivePetId}
          onChange={(e) => setPetId(e.target.value)}
          error={clientPets.length === 0 ? "This client has no pets yet." : undefined}
          disabled={clientPets.length === 0}
        >
          {clientPets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.breed}
            </option>
          ))}
        </Select>

        <Select
          label="Service"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          {activeServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMin}m · {formatGBP(s.priceGBP)}
            </option>
          ))}
        </Select>

        {/* Matting meter */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Size"
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
        <p className="-mt-1 text-xs text-ink-subtle">{COAT_HELP[coat]}</p>

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

        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <Textarea
          label="Notes (optional)"
          placeholder="Anything to know for this visit…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

/** Warm, owner-facing price + time breakdown produced by the matting meter. */
export function QuoteBreakdown({
  base,
  baseMin,
  mattingFee,
  sizeFee,
  total,
  totalMin,
  reason,
}: {
  base: number;
  baseMin: number;
  mattingFee: number;
  sizeFee: number;
  total: number;
  totalMin: number;
  reason: string;
}) {
  const hasSurcharge = mattingFee > 0 || sizeFee > 0;
  return (
    <div className="rounded-xl border border-DEFAULT bg-surface-sunken p-4">
      <div className="flex flex-col gap-1.5 text-sm">
        <Row label="Service" value={formatGBP(base)} />
        {sizeFee > 0 && <Row label="Giant breed" value={`+${formatGBP(sizeFee)}`} />}
        {mattingFee > 0 && <Row label="Extra coat care" value={`+${formatGBP(mattingFee)}`} />}
        <div className="my-1 border-t border-DEFAULT" />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink">Total</span>
          <span className="tabular-nums font-semibold text-ink">{formatGBP(total)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <Clock className="h-3.5 w-3.5" />
          {totalMin} minutes booked
          {totalMin > baseMin && (
            <span className="text-ink-subtle">(+{totalMin - baseMin} for care)</span>
          )}
        </div>
      </div>
      {hasSurcharge && reason && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-accent-50 p-2.5 text-xs text-accent-700">
          <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {reason}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
