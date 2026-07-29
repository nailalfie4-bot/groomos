"use client";

/**
 * One-tap WhatsApp button. Renders an anchor to a wa.me deep link (opens
 * WhatsApp — mobile or desktop/web — with the message pre-filled) that the
 * groomer taps send on. We send NOTHING automatically. When the number is
 * missing/invalid it renders a disabled control whose reason is surfaced (title
 * + optional inline text) rather than failing silently.
 */
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { waLink, type PhoneStatus } from "@/lib/whatsapp";

type Tone = "solid" | "soft";
type Size = "sm" | "md";

const SIZE: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
};

export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  tone = "solid",
  size = "md",
  stopPropagation = false,
  className,
}: {
  phone: PhoneStatus;
  message: string;
  label?: string;
  tone?: Tone;
  size?: Size;
  /** Stop the click bubbling (e.g. inside a clickable calendar card). */
  stopPropagation?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors";

  if (!phone.ok) {
    return (
      <button
        type="button"
        disabled
        title={phone.reason}
        aria-label={`${label} unavailable — ${phone.reason}`}
        className={cn(base, SIZE[size], "cursor-not-allowed border border-strong bg-surface text-ink-subtle opacity-60", className)}
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </button>
    );
  }

  const toneCls =
    tone === "solid"
      ? "bg-success text-ink-inverse hover:bg-success/90 active:bg-success-deep"
      : "border border-success/40 bg-success-soft text-success-deep hover:bg-success-soft/70";

  return (
    <a
      href={waLink(phone.number, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(base, SIZE[size], toneCls, className)}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}
