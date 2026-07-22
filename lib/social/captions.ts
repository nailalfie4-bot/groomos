/**
 * Social Post Helper — caption + hashtag generation (pure, no dependencies).
 *
 * Groomers already photograph every dog; the friction is writing the caption
 * and remembering hashtags. We hold the dog's name, breed, service, and the
 * business's details, so we assemble a ready-to-post caption in one tap. This
 * is deliberately template-based (no LLM): deterministic, instant, free, and
 * offline-safe. Three genuinely different shapes per tone keep posts from all
 * looking identical.
 */

export type SocialTone = "cute" | "professional" | "playful";

export const SOCIAL_TONES: { id: SocialTone; label: string }[] = [
  { id: "cute", label: "Cute" },
  { id: "professional", label: "Professional" },
  { id: "playful", label: "Playful" },
];

export interface SocialPostInput {
  dogName: string;
  breed?: string;
  serviceName: string;
  businessName: string;
  /** Public booking link, e.g. https://…/book/<slug>. Omitted → "link in bio". */
  bookingLink?: string;
  /** Business town/city, used only for the local hashtag. */
  town?: string;
}

/** A real breed, or null when it's blank / the "Unknown" placeholder. */
function cleanBreed(breed?: string): string | null {
  const b = (breed ?? "").trim();
  if (!b || /^unknown$/i.test(b)) return null;
  return b;
}

/** Lowercase, alphanumeric-only slug for a hashtag body ("Full Groom" → "fullgroom"). */
function tagSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Tidy a finished caption: collapse the double period a name like "Paws & Co."
 *  leaves behind ("Co.." → "Co.") and any stray double spaces. */
function tidy(captions: string[]): string[] {
  return captions.map((s) => s.replace(/\.\.+/g, ".").replace(/ {2,}/g, " ").trim());
}

/**
 * Three caption variations for a tone. They intentionally differ in shape — a
 * greeting, a transformation line, and a punchy one — so a groomer posting
 * every day never repeats themselves.
 */
export function buildCaptions(input: SocialPostInput, tone: SocialTone): string[] {
  const name = input.dogName.trim() || "This pup";
  const service = (input.serviceName.trim() || "groom");
  const serviceLower = service.toLowerCase();
  const breed = cleanBreed(input.breed);
  const biz = input.businessName.trim() || "us";
  const link = input.bookingLink?.trim();
  const bookLine = link ? `Book your pup in at ${link}` : "Booking link in bio 🔗";
  const bookTurn = link ? `Your turn — ${link}` : "Your turn — booking link in bio 🔗";
  const withBreed = breed ? ` the ${breed}` : "";
  const parenBreed = breed ? ` (${breed})` : "";

  switch (tone) {
    case "cute":
      return tidy([
        `Meet ${name}${withBreed} 🐾 fresh from a ${service} and feeling absolutely fabulous. ${bookLine}`,
        `${name} came in for a ${service} today and left looking like a whole new pup 🥹🐶 ${bookLine}`,
        `Someone's feeling extra fluffy today ✨ ${name} after ${breed ? `their ${service}` : `a ${service}`} with ${biz}. Booking link in bio 🔗`,
      ]);
    case "professional":
      return tidy([
        `${name}${parenBreed} — ${service} complete. Thank you for trusting ${biz} with your dog's care. ${bookLine}`,
        `Freshly groomed: ${name} after ${serviceLower} today ✂️ We'd love to welcome your dog too. ${bookLine}`,
        `Another happy pup at ${biz} 🐾 ${name}'s ${serviceLower} all done. Book your appointment — link in bio.`,
      ]);
    case "playful":
      return tidy([
        `New fur, who dis? 😎 ${name}${withBreed} strutting out after a ${service}. ${bookTurn}`,
        `${name} said "make me gorgeous" and honestly? We delivered ✂️🐶 ${service} ✅ ${bookLine}`,
        `Warning: dangerously floofy levels detected 🚨 ${name} post-${serviceLower} at ${biz}. Booking link in bio 🔗`,
      ]);
  }
}

/**
 * Hashtag block built from breed, service, and the groomer's town, plus a few
 * evergreen discovery tags. Deduped and capped so it stays tidy.
 */
export function buildHashtags(input: SocialPostInput): string {
  const tags: string[] = [];
  const breed = cleanBreed(input.breed);
  if (breed) tags.push(`#${tagSlug(breed)}`);
  tags.push("#doggrooming");
  const svc = tagSlug(input.serviceName);
  if (svc && svc !== "doggrooming") tags.push(`#${svc}`);
  const town = tagSlug(input.town ?? "");
  if (town) tags.push(`#${town}doggroomer`);
  tags.push("#beforeandafter", "#dogsofinstagram", "#doggroomer", "#dogsofinsta");
  return Array.from(new Set(tags.filter((t) => t.length > 1)))
    .slice(0, 8)
    .join(" ");
}

/** Caption + hashtags, ready to paste into Instagram/Facebook. */
export function buildPostText(input: SocialPostInput, tone: SocialTone, variationIndex: number): string {
  const captions = buildCaptions(input, tone);
  const caption = captions[Math.max(0, Math.min(variationIndex, captions.length - 1))];
  return `${caption}\n\n${buildHashtags(input)}`;
}
