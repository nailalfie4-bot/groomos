"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Copy, Heart, Link2, Mail, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { useStore } from "@/lib/mock/store";
import { useAuth } from "@/components/auth-provider";
import { formatGBP } from "@/lib/format";
import { daySlots, findClash } from "@/lib/schedule";
import { COAT_HELP, COAT_LABEL, SIZE_LABEL } from "@/lib/pricing";
import type { CoatCondition, DogSize } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Mirror of the server's DepositEmailResult, kept local so this client module
 *  never pulls in the server-only deposit-links helper. */
type EmailOutcome = {
  status: "sent" | "failed" | "no_address" | "not_configured";
  to: string | null;
};

/** What came back from booking + trying to mint a deposit link. */
type LinkOutcome =
  | { kind: "link"; url: string; email: EmailOutcome }
  | { kind: "recorded"; message?: string }
  | { kind: "error"; message: string };

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
  defaultClientId,
  defaultPetId,
}: {
  open: boolean;
  onClose: () => void;
  /** Optional ISO datetime to pre-fill (e.g. a clicked calendar slot). */
  defaultStart?: string;
  /** Pre-select a client (e.g. rebooking from a pet profile). */
  defaultClientId?: string;
  /** Pre-select a pet. */
  defaultPetId?: string;
}) {
  const {
    clients,
    pets,
    services,
    appointments,
    settings,
    business,
    groomers,
    createAppointment,
    getPetsForClient,
    getClient,
    quoteFor,
    flushWrites,
  } = useStore();
  const { configured } = useAuth();
  const activeServices = useMemo(
    () => services.filter((s) => s.active),
    [services],
  );

  const initialDate = defaultStart ? new Date(defaultStart) : new Date();
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [petId, setPetId] = useState(defaultPetId ?? "");
  const [serviceId, setServiceId] = useState(activeServices[0]?.id ?? "");
  const [size, setSize] = useState<DogSize>("medium");
  const [coat, setCoat] = useState<CoatCondition>("smooth");
  const [date, setDate] = useState(toDateValue(initialDate));
  const [time, setTime] = useState(
    defaultStart ? toTimeValue(initialDate) : "",
  );
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState(settings.depositEnabled);
  const [groomerId, setGroomerId] = useState(groomers[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Deposit-link flow (phone bookings): book + mint a link the groomer can copy.
  const [sendingLink, setSendingLink] = useState(false);
  const [linkResult, setLinkResult] = useState<LinkOutcome | null>(null);

  // Reflect the latest defaults each time the form opens (slot click, rebook).
  useEffect(() => {
    if (!open) return;
    const d = defaultStart ? new Date(defaultStart) : new Date();
    setDate(toDateValue(d));
    setTime(defaultStart ? toTimeValue(d) : "");
    if (defaultClientId) setClientId(defaultClientId);
    setPetId(defaultPetId ?? "");
    setNotes("");
    setDeposit(settings.depositEnabled);
    setGroomerId(groomers[0]?.id ?? "");
    setError(null);
    setSendingLink(false);
    setLinkResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultStart, defaultClientId, defaultPetId]);

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

  // The day's start times, with taken / past / too-late ones flagged. The
  // groom's true length (incl. matting/size) drives what can fit.
  const groomMinutes = quote?.totalDurationMin ?? 60;
  const selectedDay = useMemo(() => new Date(`${date}T00:00:00`), [date]);
  const slots = useMemo(
    () => daySlots(appointments, settings, business, selectedDay, groomMinutes),
    [appointments, settings, business, selectedDay, groomMinutes],
  );
  const hasFree = slots.some((s) => s.available);

  // Drop a chosen time if a longer groom or a new day makes it unavailable.
  useEffect(() => {
    if (time && !slots.some((s) => s.available && s.time === time)) setTime("");
  }, [slots, time]);

  // Whenever a deposit is being taken, "Send deposit link" is the primary action
  // (it books AND emails the client their pay-by-card link). We deliberately do
  // NOT gate on the client-side Connect status — that read can be stale and was
  // hiding the button. The server decides, and falls back to a recorded deposit
  // if card charging isn't live yet.
  const depositLinkPrimary = deposit && settings.depositAmount > 0;

  /** Validate the form and build the appointment input, or set an error + null. */
  function collectInput(): Parameters<typeof createAppointment>[0] | null {
    setError(null);
    if (!clientId || !effectivePetId || !serviceId) {
      setError("Pick a client, pet and service to book.");
      return null;
    }
    if (!time) {
      setError("Tap an available time slot to book.");
      return null;
    }
    const start = new Date(`${date}T${time}`);
    // Never let the groomer double-book themselves (incl. cleanup buffer).
    const clash = quote
      ? findClash(appointments, settings, start.toISOString(), quote.totalDurationMin)
      : null;
    if (clash) {
      setError("That time clashes with another dog (including cleanup time). Pick another slot.");
      return null;
    }
    return {
      clientId,
      petId: effectivePetId,
      serviceId,
      start: start.toISOString(),
      source: "staff",
      status: "confirmed",
      coatCondition: coat,
      size,
      notes,
      groomerId: groomerId || undefined,
      deposit: deposit && settings.depositAmount > 0 ? settings.depositAmount : undefined,
    };
  }

  function submit() {
    const input = collectInput();
    if (!input) return;
    setSaving(true);
    setTimeout(() => {
      try {
        createAppointment(input);
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

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function postLink(appointmentId: string): Promise<{ ok?: boolean; error?: string; message?: string; token?: string; emailedTo?: string | null; email?: EmailOutcome } | null> {
    const res = await fetch("/api/appointments/deposit-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appointmentId }),
    });
    return res.json().catch(() => null);
  }

  /**
   * Book the appointment AND mint its deposit link in one step — the exact
   * moment the groomer is on the phone. Books first, then generates the link;
   * the server re-prices, marks the appointment, AND emails the client the
   * "pay your deposit" link when we have their address. Falls back gracefully
   * to a recorded deposit if the business can't charge cards yet.
   */
  async function sendDepositLink() {
    const input = collectInput();
    if (!input) return;
    setSendingLink(true);
    try {
      const appt = createAppointment({ ...input, deposit: settings.depositAmount });
      const clientEmail = getClient(clientId)?.email || null;

      if (!configured) {
        // Demo: show a representative link so the whole flow is visible.
        const url = `${window.location.origin}/pay/demo-${appt.id}`;
        await copyToClipboard(url);
        setLinkResult({
          kind: "link",
          url,
          email: { status: clientEmail ? "sent" : "no_address", to: clientEmail },
        });
        toast.success("Appointment booked · deposit link ready");
        return;
      }

      await flushWrites(); // ensure the appointment row exists before minting
      let d = await postLink(appt.id);
      // The insert may still be propagating — retry a not-found once.
      if (d && !d.ok && d.error === "not_found") {
        await new Promise((r) => setTimeout(r, 700));
        d = await postLink(appt.id);
      }

      if (d?.ok && d.token) {
        const url = `${window.location.origin}/pay/${d.token}`;
        await copyToClipboard(url);
        setLinkResult({
          kind: "link",
          url,
          email: d.email ?? { status: "no_address", to: null },
        });
        toast.success("Appointment booked · deposit link ready");
      } else if (d?.error === "not_connected") {
        // Booked fine, but card charging isn't live — the deposit is recorded.
        setLinkResult({ kind: "recorded", message: d.message });
        toast("Appointment booked · deposit recorded");
      } else {
        setLinkResult({
          kind: "error",
          message: d?.message ?? "The deposit link couldn't be created, but the appointment is booked.",
        });
      }
    } catch {
      setLinkResult({
        kind: "error",
        message: "Couldn't reach the server to create the link — the appointment is booked; try sending the link from the appointment.",
      });
    } finally {
      setSendingLink(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New appointment"
      description="Book a slot — pricing and time adjust for size and coat."
      footer={
        linkResult ? (
          <Button size="sm" onClick={onClose}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        ) : depositLinkPrimary ? (
          <>
            <Button variant="ghost" size="sm" onClick={submit} disabled={saving || sendingLink}>
              Just book
            </Button>
            <Button size="sm" loading={sendingLink} disabled={saving || sendingLink} onClick={sendDepositLink}>
              {!sendingLink && <Link2 className="h-4 w-4" />}
              Send deposit link
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submit}>
              {!saving && <Check className="h-4 w-4" />}
              Book {quote ? formatGBP(quote.totalPriceGBP) : ""}
            </Button>
          </>
        )
      }
    >
      {linkResult ? (
        <DepositLinkReady
          result={linkResult}
          amount={settings.depositAmount}
          petName={pet?.name}
          onCopy={copyToClipboard}
        />
      ) : (
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

        {groomers.length > 0 && (
          <Select
            label="Groomer"
            value={groomerId}
            onChange={(e) => setGroomerId(e.target.value)}
          >
            {groomers.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        )}

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

        {/* Deposit & no-show protection */}
        <div className="rounded-xl border border-DEFAULT p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Take a {formatGBP(settings.depositAmount)} deposit
            </span>
            <Toggle checked={deposit} onChange={setDeposit} label="Require a deposit" />
          </div>
          {deposit && (
            <p className="mt-2 text-xs text-ink-muted">
              Applied to the {quote ? formatGBP(quote.totalPriceGBP) : "groom"} · kept if they no-show ·
              free cancellation up to {settings.cancellationNoticeHours}h before.
            </p>
          )}
          {depositLinkPrimary && (
            <p className="mt-3 flex items-start gap-1.5 border-t border-DEFAULT pt-3 text-[11px] text-ink-subtle">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              Phone booking? Tap <span className="font-medium text-ink-muted">Send deposit link</span> below to book
              and text/email the client a secure pay-by-card link.
            </p>
          )}
        </div>

        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setTime("");
            setError(null);
          }}
        />

        {/* Tap an available slot — no free-form times, so no overlaps. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">Time</span>
            <span className="text-xs text-ink-subtle">{groomMinutes} min slot</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => {
              const selected = time === s.time;
              return (
                <button
                  key={s.time}
                  type="button"
                  disabled={!s.available}
                  aria-pressed={selected}
                  title={
                    s.reason === "taken"
                      ? "Already booked"
                      : s.reason === "past"
                        ? "Already passed"
                        : s.reason === "tooLate"
                          ? "Not enough time before closing"
                          : undefined
                  }
                  onClick={() => {
                    setTime(s.time);
                    setError(null);
                  }}
                  className={cn(
                    "tabular-nums rounded-lg border px-1 py-2 text-sm font-medium transition-colors duration-fast",
                    selected
                      ? "border-accent bg-accent text-ink-inverse shadow-sm"
                      : s.available
                        ? "border-strong bg-surface text-ink hover:border-accent hover:bg-accent-50 hover:text-accent-700"
                        : "cursor-not-allowed border-transparent bg-surface-sunken text-ink-subtle/60",
                  )}
                >
                  {s.time}
                </button>
              );
            })}
          </div>
          {!hasFree && (
            <p className="text-xs text-ink-muted">
              No free slots on this day — try another date.
            </p>
          )}
        </div>

        <Textarea
          label="Notes (optional)"
          placeholder="Anything to know for this visit…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      )}
    </Modal>
  );
}

/** The panel shown after Book + Send deposit link — link to copy, or a clear
 *  "booked, deposit recorded / link failed" fallback. */
function DepositLinkReady({
  result,
  amount,
  petName,
  onCopy,
}: {
  result: LinkOutcome;
  amount: number;
  petName?: string;
  onCopy: (text: string) => Promise<boolean>;
}) {
  const [copied, setCopied] = useState(true); // auto-copied on generate

  if (result.kind !== "link") {
    const isError = result.kind === "error";
    return (
      <div className="flex flex-col items-center gap-3 pb-2 text-center">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            isError ? "bg-warning-soft text-warning-deep" : "bg-success-soft text-success-deep",
          )}
        >
          <Check className="h-6 w-6" />
        </span>
        <p className="text-base font-semibold text-ink">
          {isError ? "Appointment booked" : "Booked — deposit recorded"}
        </p>
        <p className="max-w-xs text-sm text-ink-muted">
          {result.message ??
            (isError
              ? "The pay-by-card link couldn't be created — you can send it later from the appointment."
              : `A ${formatGBP(amount)} deposit is recorded on this booking. Connect Stripe in Settings to send clients a pay-by-card link.`)}
        </p>
      </div>
    );
  }

  // `result` is narrowed to the "link" variant here, but it's a mutable param
  // binding so the narrowing doesn't survive into the closure below — pin it.
  const link = result;

  async function copy() {
    const ok = await onCopy(link.url);
    setCopied(ok);
    if (ok) toast.success("Link copied");
    else toast.error("Couldn't copy — long-press the link to copy it.");
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-deep">
          <Check className="h-6 w-6" />
        </span>
        <p className="text-base font-semibold text-ink">Booked — deposit link ready</p>
        <p className="max-w-xs text-sm text-ink-muted">
          Text this to {petName ? `${petName}'s owner` : "the client"} to take their {formatGBP(amount)} deposit.
          It pays straight into your Stripe account and marks this booking paid.
        </p>
      </div>

      <div className="rounded-xl border border-DEFAULT bg-surface-sunken p-3">
        <p className="break-all text-xs text-ink-muted">{link.url}</p>
      </div>

      <Button size="md" className="w-full" onClick={copy}>
        <Copy className="h-4 w-4" />
        {copied ? "Copied — copy again" : "Copy link"}
      </Button>

      {link.email.status === "sent" ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-subtle">
          <Mail className="h-3.5 w-3.5" /> Emailed to the client at {link.email.to}.
        </p>
      ) : link.email.status === "failed" ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-warning-deep">
          <Mail className="h-3.5 w-3.5" /> Couldn&apos;t email the client at {link.email.to} — text them the link above instead.
        </p>
      ) : link.email.status === "not_configured" ? (
        <p className="text-center text-xs text-ink-subtle">
          Email isn&apos;t switched on yet — text the client the link above.
        </p>
      ) : (
        <p className="text-center text-xs text-ink-subtle">
          No email on file for this client — text them the link above.
        </p>
      )}
    </div>
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
