"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarHeart, Camera, Check, Heart, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/mock/store";
import { addDays, formatDate, formatGBP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GroomingReport } from "@/lib/types";

/** Renders a photo if it's a real data/URL, else a labelled placeholder tile. */
function Photo({ src, label }: { src?: string; label: string }) {
  const isReal = src && (src.startsWith("data:") || src.startsWith("http"));
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-DEFAULT bg-surface-sunken">
      {isReal ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-accent-50 text-accent-300">
          <Camera className="h-7 w-7" />
        </div>
      )}
      <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-inverse">
        {label}
      </span>
    </div>
  );
}

function PhotoUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (dataUrl: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isReal = value && (value.startsWith("data:") || value.startsWith("http"));
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={cn(
          "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-strong bg-surface-sunken text-ink-subtle transition-colors hover:border-accent hover:text-accent",
        )}
      >
        {isReal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs">
            <Camera className="h-6 w-6" />
            Add {label}
          </span>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => onChange(String(reader.result));
          reader.readAsDataURL(f);
        }}
      />
    </div>
  );
}

/**
 * The complete-and-rebook flow: attach a before/after report, then a one-tap
 * rebooking nudge. Opened when the groomer marks an appointment complete.
 */
export function CompleteFlow({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const { appointments, getPet, attachReport, createAppointment } = useStore();
  const appt = appointments.find((a) => a.id === appointmentId) ?? null;
  const pet = appt ? getPet(appt.petId) : undefined;

  const [step, setStep] = useState<"report" | "rebook">("report");
  const [before, setBefore] = useState<string | undefined>();
  const [after, setAfter] = useState<string | undefined>();
  const [summary, setSummary] = useState("");

  function reset() {
    setStep("report");
    setBefore(undefined);
    setAfter(undefined);
    setSummary("");
  }

  function close() {
    reset();
    onClose();
  }

  if (!appt || !pet) return null;

  function saveReport() {
    const report: GroomingReport = {
      beforePhoto: before,
      afterPhoto: after,
      summary:
        summary.trim() ||
        `${pet!.name} was a star today — all done and looking lovely.`,
      createdAt: new Date().toISOString(),
    };
    attachReport(appt!.id, report);
    toast.success("Marked complete", { description: `${pet!.name}'s report is ready` });
    setStep("rebook");
  }

  function rebook(weeks: number) {
    const start = addDays(new Date(appt!.start), weeks * 7);
    createAppointment({
      clientId: appt!.clientId,
      petId: appt!.petId,
      serviceId: appt!.serviceId,
      start: start.toISOString(),
      source: "staff",
      status: "confirmed",
      coatCondition: "smooth",
    });
    toast.success(`${pet!.name} rebooked`, { description: `${formatDate(start.toISOString())}` });
    close();
  }

  return (
    <Modal
      open={appointmentId !== null}
      onClose={close}
      title={step === "report" ? "Finish up & send a report" : `Rebook ${pet.name}?`}
      description={
        step === "report"
          ? "Add a couple of photos and a friendly note — the owner gets a lovely card."
          : "Get the next groom in the diary before they leave."
      }
      footer={
        step === "report" ? (
          <>
            <Button variant="ghost" size="sm" onClick={close}>
              Skip
            </Button>
            <Button size="sm" onClick={saveReport}>
              <Check className="h-4 w-4" />
              Complete & send card
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={close}>
            Not now
          </Button>
        )
      }
    >
      {step === "report" ? (
        <div className="flex flex-col gap-4 pb-2">
          <div className="grid grid-cols-2 gap-3">
            <PhotoUpload label="before" value={before} onChange={setBefore} />
            <PhotoUpload label="after" value={after} onChange={setAfter} />
          </div>
          <Textarea
            label="A note for the owner"
            placeholder={`How did ${pet.name} get on today?`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {[6, 8, 12].map((w) => (
              <button
                key={w}
                onClick={() => rebook(w)}
                className="flex flex-col items-center gap-1 rounded-xl border border-strong bg-surface px-3 py-4 text-center transition-colors hover:border-accent hover:bg-accent-50"
              >
                <CalendarHeart className="h-5 w-5 text-accent" />
                <span className="text-sm font-semibold text-ink">{w} weeks</span>
                <span className="text-[11px] text-ink-subtle">
                  {formatDate(addDays(new Date(appt.start), w * 7).toISOString())}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-subtle">
            We&apos;ll remind {pet.name}&apos;s owner automatically before the day.
          </p>
        </div>
      )}
    </Modal>
  );
}

/** A lovely, shareable before/after card the owner receives. */
export function ReportCard({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const { appointments, getPet, getService, business } = useStore();
  const appt = appointments.find((a) => a.id === appointmentId) ?? null;
  const pet = appt ? getPet(appt.petId) : undefined;
  const service = appt ? getService(appt.serviceId) : undefined;
  if (!appt || !pet || !appt.report) return null;

  return (
    <Modal open={appointmentId !== null} onClose={onClose}>
      <div className="-mx-6 -mt-2 flex flex-col">
        <div className="bg-accent px-6 py-5 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-inverse/80">
            <Sparkles className="h-3.5 w-3.5" /> {business.name}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink-inverse">
            {pet.name}&apos;s groom
          </h2>
          <p className="text-sm text-ink-inverse/85">
            {service?.name} · {formatDate(appt.start)} · {formatGBP(appt.priceGBP)}
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <Photo src={appt.report.beforePhoto} label="before" />
            <Photo src={appt.report.afterPhoto} label="after" />
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent-50 p-3 text-sm text-accent-700">
            <Heart className="mt-0.5 h-4 w-4 shrink-0" />
            {appt.report.summary}
          </p>
          <p className="mt-3 text-center text-xs text-ink-subtle">
            Sent to the owner automatically · {pet.breed}
          </p>
        </div>
      </div>
    </Modal>
  );
}
