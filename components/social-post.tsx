"use client";

/**
 * Social Post Helper — one-tap captions + hashtags (and a before/after image
 * when both photos exist) for a completed groom. Groomers do this on their
 * phone between dogs, so: big tap targets, captions ready on open, and a copy
 * that grabs the caption + hashtags together.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Hash, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/mock/store";
import {
  buildCaptions,
  buildHashtags,
  SOCIAL_TONES,
  type SocialPostInput,
  type SocialTone,
} from "@/lib/social/captions";
import { composeBeforeAfter, downloadBlob, isRealPhoto } from "@/lib/social/composite";
import { cn } from "@/lib/utils";

/** The guts of the helper — reused inside the completion modal and the sheet. */
export function SocialPostContent({ appointmentId }: { appointmentId: string | null }) {
  const { appointments, getPet, getService, business } = useStore();
  const appt = appointments.find((a) => a.id === appointmentId) ?? null;
  const pet = appt ? getPet(appt.petId) : undefined;
  const service = appt ? getService(appt.serviceId) : undefined;

  const [tone, setTone] = useState<SocialTone>("cute");
  const [copied, setCopied] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const bookingLink = useMemo(() => {
    if (!business.slug || typeof window === "undefined") return undefined;
    return `${window.location.origin}/book/${business.slug}`;
  }, [business.slug]);

  const input: SocialPostInput | null = useMemo(() => {
    if (!pet || !service) return null;
    return {
      dogName: pet.name,
      breed: pet.breed,
      serviceName: service.name,
      businessName: business.name,
      bookingLink,
      town: business.city,
    };
  }, [pet, service, business.name, business.city, bookingLink]);

  const captions = useMemo(() => (input ? buildCaptions(input, tone) : []), [input, tone]);
  const hashtags = useMemo(() => (input ? buildHashtags(input) : ""), [input]);

  // Clear the "Copied" flash when the tone changes (the captions changed under it).
  useEffect(() => setCopied(null), [tone]);

  if (!appt || !pet || !service || !input) return null;

  const before = appt.report?.beforePhoto;
  const after = appt.report?.afterPhoto;
  const hasBothPhotos = isRealPhoto(before) && isRealPhoto(after);

  async function copyCaption(index: number) {
    const text = `${captions[index]}\n\n${hashtags}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(index);
      toast.success("Caption + hashtags copied", { description: "Paste it straight into Instagram or Facebook." });
      setTimeout(() => setCopied((c) => (c === index ? null : c)), 2500);
    } catch {
      toast.error("Couldn't copy — long-press the caption to copy it.");
    }
  }

  async function downloadImage() {
    if (!hasBothPhotos || !isRealPhoto(before) || !isRealPhoto(after)) return;
    setDownloading(true);
    try {
      const blob = await composeBeforeAfter({ before, after, businessName: business.name });
      if (!blob) {
        toast.error("Couldn't build the image on this device — you can still post the photos manually.");
        return;
      }
      const safe = pet!.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "groom";
      downloadBlob(blob, `${safe}-before-after.png`);
      toast.success("Before & after image saved");
    } catch {
      toast.error("Couldn't build the image — please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-1">
      {/* Tone */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink">Pick a vibe</p>
        <div className="grid grid-cols-3 gap-2">
          {SOCIAL_TONES.map((t) => {
            const active = tone === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                aria-pressed={active}
                className={cn(
                  "h-11 rounded-xl border text-sm font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-ink-inverse"
                    : "border-strong bg-surface text-ink hover:border-accent",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Captions — tap one to copy it with the hashtags */}
      <div className="flex flex-col gap-2.5">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Sparkles className="h-4 w-4 text-accent" /> Tap a caption to copy it
        </p>
        {captions.map((caption, i) => {
          const isCopied = copied === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => copyCaption(i)}
              className={cn(
                "group relative w-full rounded-2xl border p-4 pr-12 text-left text-sm leading-relaxed transition-colors",
                isCopied
                  ? "border-success bg-success-soft text-ink"
                  : "border-strong bg-surface text-ink hover:border-accent hover:bg-accent-50",
              )}
            >
              {caption}
              <span
                className={cn(
                  "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                  isCopied ? "bg-success text-ink-inverse" : "bg-surface-sunken text-ink-muted group-hover:bg-accent group-hover:text-ink-inverse",
                )}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-3.5 w-3.5" />}
              </span>
              {isCopied && (
                <span className="mt-2 block text-xs font-medium text-success-deep">
                  Copied with hashtags — paste &amp; post ✨
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hashtags — included automatically when you copy */}
      <div className="rounded-2xl border border-DEFAULT bg-surface-sunken p-3.5">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <Hash className="h-3.5 w-3.5" /> Hashtags · added when you copy
        </p>
        <p className="text-sm leading-relaxed text-accent-700">{hashtags}</p>
      </div>

      {/* Before/after image — only when both photos already exist */}
      {hasBothPhotos ? (
        <Button size="md" variant="secondary" className="w-full" onClick={downloadImage} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download before &amp; after image
        </Button>
      ) : (
        <p className="rounded-xl bg-surface-sunken px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
          💡 Add a <span className="font-medium text-ink">before</span> and{" "}
          <span className="font-medium text-ink">after</span> photo to this groom (on the before &amp; after card) to
          unlock a ready-made side-by-side image for your post.
        </p>
      )}
    </div>
  );
}

/** Standalone modal wrapper — used from the appointment sheet and client record. */
export function SocialPostSheet({
  appointmentId,
  onClose,
}: {
  appointmentId: string | null;
  onClose: () => void;
}) {
  const { appointments, getPet } = useStore();
  const appt = appointments.find((a) => a.id === appointmentId) ?? null;
  const pet = appt ? getPet(appt.petId) : undefined;

  return (
    <Modal
      open={appointmentId !== null}
      onClose={onClose}
      title={pet ? `Share ${pet.name}'s groom` : "Create social post"}
      description="A ready-to-post caption and hashtags — copy, then paste into Instagram or Facebook."
      footer={
        <Button size="sm" onClick={onClose}>
          <Check className="h-4 w-4" />
          Done
        </Button>
      }
    >
      <SocialPostContent appointmentId={appointmentId} />
    </Modal>
  );
}
