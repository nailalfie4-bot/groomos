"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/mock/store";
import { formatGBP } from "@/lib/format";

/** yyyy-mm-dd for a date, in local time. */
function toDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  const { clients, pets, services, createAppointment, getPetsForClient } =
    useStore();
  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services],
  );

  const initialDate = defaultStart ? new Date(defaultStart) : new Date();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState(activeServices[0]?.id ?? "");
  const [date, setDate] = useState(toDateValue(initialDate));
  const [time, setTime] = useState(
    defaultStart ? toTimeValue(initialDate) : "09:00",
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientPets = clientId ? getPetsForClient(clientId) : [];
  // Keep the selected pet valid for the chosen client.
  const effectivePetId =
    clientPets.find((p) => p.id === petId)?.id ?? clientPets[0]?.id ?? "";

  function submit() {
    setError(null);
    if (!clientId || !effectivePetId || !serviceId) {
      setError("Pick a client, pet and service to book.");
      return;
    }
    setSaving(true);
    // Simulate a tiny async write so the button shows its loading state.
    setTimeout(() => {
      try {
        const start = new Date(`${date}T${time}`);
        createAppointment({
          clientId,
          petId: effectivePetId,
          serviceId,
          start: start.toISOString(),
          source: "staff",
          status: "confirmed",
          notes,
        });
        const pet = pets.find((p) => p.id === effectivePetId);
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
    }, 500);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New appointment"
      description="Book a slot for an existing client and pet."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={saving} onClick={submit}>
            {!saving && <Check className="h-4 w-4" />}
            Book appointment
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

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <Textarea
          label="Notes (optional)"
          placeholder="Anything the groomer should know for this visit…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
