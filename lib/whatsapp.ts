/**
 * WhatsApp deep links (wa.me) — pure, no I/O.
 *
 * We NEVER send anything automatically and use NO unofficial WhatsApp library
 * (Baileys / whatsapp-web.js etc. breach WhatsApp's terms and can get the
 * groomer's own number banned). We only build a wa.me link with the client's
 * number + a pre-filled message; the groomer opens WhatsApp and taps send. Works
 * on WhatsApp mobile and desktop/web.
 */
import type { WhatsappTemplates } from "@/lib/types";

/** Sensible, editable defaults. Placeholders in {braces} are filled per booking. */
export const DEFAULT_WHATSAPP_TEMPLATES: WhatsappTemplates = {
  reminder:
    "Hi {client}, just a reminder that {dog} is booked in with {business} on {date} at {time}. See you then! 🐾",
  deposit:
    "Hi {client}, to secure {dog}'s groom with {business} on {date} at {time}, please pop your deposit here: {deposit_link} — thank you!",
  rebook:
    "Hi {client}, it's {business} 🐾 {dog} is due a groom — shall I get their next appointment booked in? Let me know a day that suits.",
};

/** The placeholders a groomer can use in their templates. */
export const WHATSAPP_PLACEHOLDERS = [
  "business",
  "client",
  "dog",
  "date",
  "time",
  "service",
  "deposit_link",
] as const;

export type TemplateVar = (typeof WHATSAPP_PLACEHOLDERS)[number];
export type TemplateVars = Partial<Record<TemplateVar, string>>;

/**
 * Fill a template's known {placeholders}. Only the known set is substituted, so
 * a groomer typing a literal "{...}" elsewhere is left untouched. Empty vars
 * collapse tidily (no double spaces / dangling lines).
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  let out = template;
  for (const key of WHATSAPP_PLACEHOLDERS) {
    out = out.split(`{${key}}`).join(vars[key] ?? "");
  }
  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

/**
 * Normalise a phone number to the wa.me digits form (country code + number, no
 * "+", no spaces). Tuned for UK input — strips a leading 0 and adds 44 — while
 * still passing through numbers already in international form.
 *
 *   "07912 345678"      -> "447912345678"
 *   "+44 7912 345678"   -> "447912345678"
 *   "0044 7912 345678"  -> "447912345678"
 *   "0161 496 0000"     -> "441614960000"
 *   "7912345678"        -> "447912345678"   (UK mobile missing its 0)
 * Returns null when there aren't enough digits to be a real number.
 */
export function toWaNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const hadPlus = raw.trim().startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (hadPlus) {
    // already international — take the digits as-is
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2); // 00 international prefix
  } else if (digits.startsWith("44")) {
    // already carries the UK country code
  } else if (digits.startsWith("0")) {
    digits = "44" + digits.slice(1); // UK national → strip 0, add 44
  } else if (digits.length === 10 && digits.startsWith("7")) {
    digits = "44" + digits; // UK mobile typed without its leading 0
  }

  // Must carry a country code to route: E.164 allows up to 15 digits.
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

export type PhoneStatus =
  | { ok: true; number: string }
  | { ok: false; reason: string };

/** Whether we can WhatsApp this number — with a human reason when we can't. */
export function phoneStatus(raw?: string | null): PhoneStatus {
  if (!raw || !raw.trim()) return { ok: false, reason: "No phone number on file" };
  const number = toWaNumber(raw);
  if (!number) return { ok: false, reason: "That number doesn't look valid for WhatsApp" };
  return { ok: true, number };
}

/** The wa.me deep link that opens WhatsApp with the message pre-filled. */
export function waLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Merge a business's saved templates over the defaults (any missing → default). */
export function resolveTemplates(t?: Partial<WhatsappTemplates> | null): WhatsappTemplates {
  return {
    reminder: t?.reminder?.trim() ? t.reminder : DEFAULT_WHATSAPP_TEMPLATES.reminder,
    deposit: t?.deposit?.trim() ? t.deposit : DEFAULT_WHATSAPP_TEMPLATES.deposit,
    rebook: t?.rebook?.trim() ? t.rebook : DEFAULT_WHATSAPP_TEMPLATES.rebook,
  };
}
