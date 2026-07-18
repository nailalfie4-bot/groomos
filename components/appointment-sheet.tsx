"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarPlus,
  Camera,
  Check,
  ClipboardCheck,
  Clock,
  Heart,
  PoundSterling,
  Repeat,
  Save,
  Scissors,
  Share2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookingForm } from "@/components/booking-form";
import { CompleteFlow, ReportCard } from "@/components/grooming-report";
import { useStore } from "@/lib/mock/store";
import type { AppointmentStatus } from "@/lib/types";
import { findClash } from "@/lib/schedule";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/appointment-ui";
import { addDays, atHour, formatGBP, formatTime } from "@/lib/format";
import { SIZE_LABEL, COAT_LABEL } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toTimeValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
/** Human date+time for the declarations/terms proof record. */
function formatProofDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppointmentSheet({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const {
    appointments,
    settings,
    getPet,
    getClient,
    getService,
    setAppointmentStatus,
    updateAppointmentNotes,
    rescheduleAppointment,
  } = useStore();

  const appt = appointments.find((a) => a.id === appointmentId) ?? null;
  const [rebooking, setRebooking] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [viewingCard, setViewingCard] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [notes, setNotes] = useState("");
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");

  useEffect(() => {
    if (!appt) return;
    setNotes(appt.notes);
    const d = new Date(appt.start);
    setRDate(toDateValue(d));
    setRTime(toTimeValue(d));
    setShowReschedule(false);
    setRebooking(false);
    setCompleting(false);
    setViewingCard(false);
  }, [appt?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!appt) return null;
  const pet = getPet(appt.petId);
  const client = getClient(appt.clientId);
  const service = getService(appt.serviceId);
  const style = STATUS_STYLE[appt.status];
  const start = new Date(appt.start);
  const end = new Date(start.getTime() + appt.durationMin * 60_000);
  const careNeeded = appt.coatCondition !== "smooth" || pet?.size === "giant";
  const notesDirty = notes !== appt.notes;
  const depositLabel = appt.deposit
    ? appt.status === "completed"
      ? `${formatGBP(appt.deposit)} applied to groom`
      : appt.status === "no-show"
        ? `${formatGBP(appt.deposit)} kept (no-show)`
        : `${formatGBP(appt.deposit)} held`
    : null;

  function setStatus(status: AppointmentStatus, label: string) {
    setAppointmentStatus(appt!.id, status);
    toast.success(label);
  }

  function saveReschedule() {
    const next = new Date(`${rDate}T${rTime}`);
    if (Number.isNaN(next.getTime())) return;
    const clash = findClash(
      appointments,
      settings,
      next.toISOString(),
      appt!.durationMin,
      appt!.id,
    );
    if (clash) {
      toast.error("That clashes with another dog", {
        description: "There isn't room (incl. cleanup time). Try another slot.",
      });
      return;
    }
    rescheduleAppointment(appt!.id, next.toISOString());
    setShowReschedule(false);
    toast.success(`Moved to ${formatTime(next.toISOString())}`);
  }

  const upcoming = appt.status === "pending" || appt.status === "confirmed";

  return (
    <>
      <Sheet
        open={appointmentId !== null && !rebooking && !completing && !viewingCard}
        onClose={onClose}
        title={pet?.name ?? "Appointment"}
        subtitle={
          client ? `${client.firstName} ${client.lastName}` : undefined
        }
        footer={<FooterActions />}
      >
        <div className="flex flex-col gap-4">
          {/* status + time */}
          <div className="flex items-center justify-between gap-3">
            <Badge tone={style.tone} dot>
              {STATUS_LABEL[appt.status]}
            </Badge>
            <span className="text-xs text-ink-subtle">
              {appt.source === "online" ? "Booked online" : "Added by you"}
            </span>
          </div>

          <div className="rounded-xl border border-DEFAULT bg-surface-sunken p-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-ink">
              <CalendarClock className="h-4 w-4 text-accent" />
              {start.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
            <p className="tabular-nums mt-1 pl-6 text-sm text-ink-muted">
              {formatTime(appt.start)} – {formatTime(end.toISOString())}
              <span className="text-ink-subtle"> · {appt.durationMin} min</span>
            </p>
          </div>

          {/* details */}
          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-DEFAULT bg-border">
            <Detail icon={<Scissors className="h-4 w-4" />} label="Service" value={service?.name ?? "—"} />
            <Detail icon={<PoundSterling className="h-4 w-4" />} label="Price" value={formatGBP(appt.priceGBP)} />
            {depositLabel && (
              <Detail icon={<ShieldCheck className="h-4 w-4" />} label="Deposit" value={depositLabel} />
            )}
            <Detail
              icon={<Heart className="h-4 w-4" />}
              label="Coat & size"
              value={`${COAT_LABEL[appt.coatCondition]} · ${SIZE_LABEL[pet?.size ?? "medium"]}`}
            />
            {pet && (
              <Detail icon={<UserRound className="h-4 w-4" />} label="Breed" value={pet.breed} />
            )}
          </dl>

          {careNeeded && (
            <p className="flex items-start gap-2 rounded-xl bg-accent-50 p-3 text-xs text-accent-700">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Extra time set aside for {pet?.size === "giant" ? "a giant breed" : "coat care"} — they won&apos;t be rushed.
            </p>
          )}

          {/* client declarations & terms — the proof record */}
          {((appt.declarations && appt.declarations.length > 0) ||
            appt.termsSignedName ||
            appt.mattingLevel ||
            appt.temperamentLevel) && (
            <div className="rounded-xl border border-DEFAULT bg-surface-sunken p-4">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
                <ClipboardCheck className="h-3.5 w-3.5" /> Client declarations &amp; terms
              </p>
              {(appt.mattingLevel || appt.temperamentLevel) && (
                <dl className="mb-3 flex flex-col gap-1.5">
                  {appt.mattingLevel && (
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <dt className="text-ink-muted">Coat declared</dt>
                      <dd className="text-right font-medium text-ink">{appt.mattingLevel}</dd>
                    </div>
                  )}
                  {appt.temperamentLevel && (
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <dt className="text-ink-muted">Temperament declared</dt>
                      <dd className="text-right font-medium text-ink">{appt.temperamentLevel}</dd>
                    </div>
                  )}
                </dl>
              )}
              {appt.declarations && appt.declarations.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {appt.declarations.map((label, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-deep" />
                      {label}
                    </li>
                  ))}
                </ul>
              )}
              {appt.termsSignedName ? (
                <div className="mt-3 border-t border-DEFAULT pt-3 text-sm text-ink">
                  Terms accepted by <span className="font-semibold">{appt.termsSignedName}</span>
                  {appt.termsAcceptedAt ? ` on ${formatProofDate(appt.termsAcceptedAt)}` : ""}.
                  {appt.termsText && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs font-medium text-accent">
                        View the terms they agreed to
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface p-3 text-xs leading-relaxed text-ink-muted">
                        {appt.termsText}
                      </p>
                    </details>
                  )}
                </div>
              ) : (
                appt.termsAcceptedAt && (
                  <p className="mt-2.5 text-xs text-ink-subtle">
                    Confirmed by the client on {formatProofDate(appt.termsAcceptedAt)}.
                  </p>
                )
              )}
            </div>
          )}

          {/* status actions */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
              Update status
            </p>
            <div className="flex flex-wrap gap-2">
              {appt.status !== "confirmed" && upcoming && (
                <StatusButton onClick={() => setStatus("confirmed", "Confirmed")}>
                  <Check className="h-4 w-4" /> Confirm
                </StatusButton>
              )}
              {upcoming && (
                <StatusButton onClick={() => setCompleting(true)}>
                  <Check className="h-4 w-4" /> Mark complete
                </StatusButton>
              )}
              {upcoming && (
                <StatusButton onClick={() => setStatus("no-show", "Marked no-show")}>
                  <X className="h-4 w-4" /> No-show
                </StatusButton>
              )}
              {!upcoming && appt.status !== "cancelled" && (
                <StatusButton onClick={() => setStatus("confirmed", "Reopened")}>
                  <Repeat className="h-4 w-4" /> Reopen
                </StatusButton>
              )}
              {appt.status !== "cancelled" && (
                <StatusButton danger onClick={() => setStatus("cancelled", "Cancelled")}>
                  Cancel
                </StatusButton>
              )}
            </div>
          </div>

          {/* reschedule (upcoming only) */}
          {upcoming && (
            <div>
              {!showReschedule ? (
                <button
                  onClick={() => setShowReschedule(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-600"
                >
                  <CalendarClock className="h-4 w-4" /> Reschedule
                </button>
              ) : (
                <div className="rounded-xl border border-DEFAULT p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} />
                    <Input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)} />
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowReschedule(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveReschedule}>
                      Save time
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* notes */}
          <div>
            <Textarea
              label="Visit notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was done, anything to remember…"
            />
            {notesDirty && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    updateAppointmentNotes(appt.id, notes);
                    toast.success("Notes saved");
                  }}
                >
                  <Save className="h-4 w-4" /> Save notes
                </Button>
              </div>
            )}
          </div>

          {/* before & after card */}
          {appt.status === "completed" &&
            (appt.report ? (
              <button
                onClick={() => setViewingCard(true)}
                className="w-full rounded-xl border border-accent/30 bg-accent-50 p-4 text-left transition-colors hover:bg-accent-100"
              >
                <p className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent-700">
                  <span className="inline-flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5" /> Before &amp; after card
                  </span>
                  <span className="inline-flex items-center gap-1 tracking-normal">
                    <Share2 className="h-3.5 w-3.5" /> View &amp; share
                  </span>
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink">{appt.report.summary}</p>
              </button>
            ) : (
              <Button variant="secondary" size="md" className="w-full" onClick={() => setCompleting(true)}>
                <Camera className="h-4 w-4" /> Add a before &amp; after card
              </Button>
            ))}
        </div>
      </Sheet>

      <BookingForm
        open={rebooking}
        onClose={() => {
          setRebooking(false);
          onClose();
        }}
        defaultClientId={appt.clientId}
        defaultPetId={appt.petId}
        defaultStart={atHour(
          addDays(new Date(), settings.defaultRebookWeeks * 7),
          9,
        )}
      />

      <CompleteFlow
        appointmentId={completing ? appt.id : null}
        onClose={() => {
          setCompleting(false);
          onClose();
        }}
      />
      <ReportCard
        appointmentId={viewingCard ? appt.id : null}
        onClose={() => setViewingCard(false)}
      />
    </>
  );

  function FooterActions() {
    return (
      <>
        <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
          Close
        </Button>
        <Button size="md" className="flex-1" onClick={() => setRebooking(true)}>
          <CalendarPlus className="h-4 w-4" />
          {appt && (appt.status === "completed" || appt.status === "no-show")
            ? "Rebook"
            : "Book again"}
        </Button>
      </>
    );
  }
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5">
      <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
        <span className="text-ink-subtle">{icon}</span>
        {label}
      </span>
      <span className="truncate text-sm font-medium text-ink">{value}</span>
    </div>
  );
}

function StatusButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-fast",
        danger
          ? "border-strong text-danger hover:bg-danger hover:text-ink-inverse hover:border-transparent"
          : "border-strong bg-surface text-ink hover:bg-surface-sunken",
      )}
    >
      {children}
    </button>
  );
}
