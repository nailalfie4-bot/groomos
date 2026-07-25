/**
 * Directory domain types + pure rules. No I/O here, so these are safe in server
 * components, route handlers and the (server-only) data layer alike.
 *
 * The directory is deliberately separate from the product's customer types
 * (lib/types.ts): it never references a Business/Client/Pet, so directory code
 * can't read or leak customer data.
 */

export type ListingStatus = "live" | "hidden" | "removal_requested" | "removed";
export type ClaimStatus = "pending" | "approved" | "rejected";
export type RemovalStatus = "open" | "actioned" | "dismissed";

export interface DirTown {
  id: string;
  name: string;
  slug: string;
  county: string | null;
  nearbyTownIds: string[];
  introCopy: string | null;
  groomerCount: number;
  createdAt: string;
  updatedAt: string;
}

/** A single priced service line on a verified profile. */
export interface DirServiceLine {
  name: string;
  price?: number | null;
}

export interface DirGroomer {
  id: string;
  name: string;
  slug: string;
  townId: string | null;
  websiteUrl: string | null;
  socialUrl: string | null;
  /** Public image URLs (verified profiles only; empty for unverified listings). */
  photos: string[];
  services: DirServiceLine[];
  prices: DirServiceLine[];
  openingHours: Record<string, string> | null;
  reviewScore: number | null;
  reviewCount: number;
  groomosUser: boolean;
  /** businesses.id link (no DB FK — the directory stays decoupled). */
  groomosBusinessId: string | null;
  /** The resolved /book/{slug} URL, pulled from the linked GroomOS account. */
  groomosBookingUrl: string | null;
  verified: boolean;
  listingStatus: ListingStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface DirSchool {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  courses: { name: string; description?: string | null }[];
  website: string | null;
  townId: string | null;
  partner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DirBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  heroImage: string | null;
  /** null = draft (never shown publicly / in the sitemap). */
  publishedAt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DirClaimRequest {
  id: string;
  groomerId: string | null;
  name: string;
  email: string;
  phone: string | null;
  businessVerification: string | null;
  status: ClaimStatus;
  createdAt: string;
}

export interface DirRemovalRequest {
  id: string;
  groomerId: string | null;
  reason: string | null;
  requesterEmail: string | null;
  status: RemovalStatus;
  createdAt: string;
}

// ── Pure rules ───────────────────────────────────────────────────────────────

/** Only 'live' listings are shown publicly and included in the sitemap. A
 *  'removed' listing must 410; 'hidden' and drafts simply don't render. */
export function isPubliclyVisible(status: ListingStatus): boolean {
  return status === "live";
}

/** A removed listing returns HTTP 410 Gone (dropped from the index for good). */
export function isGone(status: ListingStatus): boolean {
  return status === "removed";
}

/**
 * Card ordering for a town page: GroomOS users first, then verified, then the
 * rest — with a higher rating (then more reviews, then name) breaking ties.
 */
export function compareGroomersForListing(a: DirGroomer, b: DirGroomer): number {
  if (a.groomosUser !== b.groomosUser) return a.groomosUser ? -1 : 1;
  if (a.verified !== b.verified) return a.verified ? -1 : 1;
  const score = (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
  if (score !== 0) return score;
  if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
  return a.name.localeCompare(b.name);
}

/**
 * The Book Now URL for a listing — ONLY GroomOS users get one, and only when a
 * real booking URL has been pulled from their account. Everyone else returns
 * null, so an unverified listing never implies we can take its bookings.
 */
export function bookingUrlFor(g: Pick<DirGroomer, "groomosUser" | "groomosBookingUrl">): string | null {
  if (!g.groomosUser) return null;
  const url = g.groomosBookingUrl?.trim();
  return url || null;
}
