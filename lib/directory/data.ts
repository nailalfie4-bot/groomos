/**
 * Directory data access — SERVER-ONLY (service-role admin client).
 *
 * The directory tables have RLS on with no policies, so ALL access goes through
 * the service-role client here, only ever from server components / route
 * handlers. These functions touch `dir_*` tables exclusively (plus a read of a
 * single business `slug`, which is already public, to build a booking URL), so
 * directory code can never read or leak customer data.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import type {
  ClaimStatus,
  DirBlogPost,
  DirClaimRequest,
  DirGroomer,
  DirRemovalRequest,
  DirSchool,
  DirServiceLine,
  DirTown,
  ListingStatus,
  RemovalStatus,
} from "./types";
import { compareGroomersForListing } from "./types";

const admin = () => createSupabaseAdminClient();
const num = (v: unknown): number => (v == null ? 0 : typeof v === "string" ? Number(v) : (v as number));
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** A URL/DB-safe slug from free text. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function toTown(r: Record<string, unknown>): DirTown {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    county: (r.county as string) ?? null,
    nearbyTownIds: arr<string>(r.nearby_town_ids),
    introCopy: (r.intro_copy as string) ?? null,
    groomerCount: num(r.groomer_count),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toGroomer(r: Record<string, unknown>): DirGroomer {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    townId: (r.town_id as string) ?? null,
    websiteUrl: (r.website_url as string) ?? null,
    socialUrl: (r.social_url as string) ?? null,
    photos: arr<string>(r.photos),
    services: arr<DirServiceLine>(r.services),
    prices: arr<DirServiceLine>(r.prices),
    openingHours: (r.opening_hours as Record<string, string>) ?? null,
    reviewScore: r.review_score == null ? null : num(r.review_score),
    reviewCount: num(r.review_count),
    groomosUser: Boolean(r.groomos_user),
    groomosBusinessId: (r.groomos_business_id as string) ?? null,
    groomosBookingUrl: (r.groomos_booking_url as string) ?? null,
    verified: Boolean(r.verified),
    listingStatus: (r.listing_status as ListingStatus) ?? "live",
    source: (r.source as string) ?? "manual",
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toSchool(r: Record<string, unknown>): DirSchool {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) ?? null,
    courses: arr<{ name: string; description?: string | null }>(r.courses),
    website: (r.website as string) ?? null,
    townId: (r.town_id as string) ?? null,
    partner: Boolean(r.partner),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function toPost(r: Record<string, unknown>): DirBlogPost {
  return {
    id: r.id as string,
    title: r.title as string,
    slug: r.slug as string,
    excerpt: (r.excerpt as string) ?? null,
    body: (r.body as string) ?? null,
    heroImage: (r.hero_image as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
    metaTitle: (r.meta_title as string) ?? null,
    metaDescription: (r.meta_description as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// ── Public reads ─────────────────────────────────────────────────────────────

export async function getTownBySlug(slug: string): Promise<DirTown | null> {
  const { data } = await admin().from("dir_towns").select("*").eq("slug", slug).maybeSingle();
  return data ? toTown(data as Record<string, unknown>) : null;
}

export async function listTowns(): Promise<DirTown[]> {
  const { data } = await admin().from("dir_towns").select("*").order("name");
  return ((data as Record<string, unknown>[]) ?? []).map(toTown);
}

export async function getTownById(id: string): Promise<DirTown | null> {
  const { data } = await admin().from("dir_towns").select("*").eq("id", id).maybeSingle();
  return data ? toTown(data as Record<string, unknown>) : null;
}

/** Live listings for a town, sorted GroomOS-first → verified → the rest. */
export async function listLiveGroomersByTown(townId: string): Promise<DirGroomer[]> {
  const { data } = await admin()
    .from("dir_groomers")
    .select("*")
    .eq("town_id", townId)
    .eq("listing_status", "live");
  return ((data as Record<string, unknown>[]) ?? []).map(toGroomer).sort(compareGroomersForListing);
}

export async function getGroomerBySlug(slug: string): Promise<DirGroomer | null> {
  const { data } = await admin().from("dir_groomers").select("*").eq("slug", slug).maybeSingle();
  return data ? toGroomer(data as Record<string, unknown>) : null;
}

/** Featured groomers for the homepage — GroomOS users first. */
export async function listFeaturedGroomers(limit = 8): Promise<DirGroomer[]> {
  const { data } = await admin()
    .from("dir_groomers")
    .select("*")
    .eq("listing_status", "live")
    .limit(60);
  return ((data as Record<string, unknown>[]) ?? [])
    .map(toGroomer)
    .sort(compareGroomersForListing)
    .slice(0, limit);
}

export async function getNearbyTowns(town: DirTown): Promise<DirTown[]> {
  if (town.nearbyTownIds.length === 0) return [];
  const { data } = await admin().from("dir_towns").select("*").in("id", town.nearbyTownIds);
  return ((data as Record<string, unknown>[]) ?? []).map(toTown);
}

export async function getSchoolBySlug(slug: string): Promise<DirSchool | null> {
  const { data } = await admin().from("dir_schools").select("*").eq("slug", slug).maybeSingle();
  return data ? toSchool(data as Record<string, unknown>) : null;
}

export async function listSchools(): Promise<DirSchool[]> {
  const { data } = await admin().from("dir_schools").select("*").order("name");
  return ((data as Record<string, unknown>[]) ?? []).map(toSchool);
}

export async function getPublishedPostBySlug(slug: string): Promise<DirBlogPost | null> {
  const { data } = await admin().from("dir_blog_posts").select("*").eq("slug", slug).maybeSingle();
  const post = data ? toPost(data as Record<string, unknown>) : null;
  return post && post.publishedAt ? post : null;
}

export async function listPublishedPosts(): Promise<DirBlogPost[]> {
  const { data } = await admin()
    .from("dir_blog_posts")
    .select("*")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  return ((data as Record<string, unknown>[]) ?? []).map(toPost);
}

/** A 301 target for a changed slug, or null. */
export async function getRedirectTarget(fromPath: string): Promise<string | null> {
  const { data } = await admin().from("dir_redirects").select("to_path").eq("from_path", fromPath).maybeSingle();
  return (data as { to_path?: string } | null)?.to_path ?? null;
}

/** Just a listing's status by slug — for the middleware's 410 check. */
export async function getGroomerStatusBySlug(slug: string): Promise<ListingStatus | null> {
  const { data } = await admin().from("dir_groomers").select("listing_status").eq("slug", slug).maybeSingle();
  return (data as { listing_status?: ListingStatus } | null)?.listing_status ?? null;
}

/** Homepage/nav search across town + groomer names (live only). */
export async function searchDirectory(q: string): Promise<{ towns: DirTown[]; groomers: DirGroomer[] }> {
  const term = q.trim();
  if (!term) return { towns: [], groomers: [] };
  const like = `%${term}%`;
  const [{ data: towns }, { data: groomers }] = await Promise.all([
    admin().from("dir_towns").select("*").ilike("name", like).limit(10),
    admin().from("dir_groomers").select("*").eq("listing_status", "live").ilike("name", like).limit(10),
  ]);
  return {
    towns: ((towns as Record<string, unknown>[]) ?? []).map(toTown),
    groomers: ((groomers as Record<string, unknown>[]) ?? []).map(toGroomer).sort(compareGroomersForListing),
  };
}

// ── Admin reads (founder-gated callers only) ─────────────────────────────────

function toClaim(r: Record<string, unknown>): DirClaimRequest {
  return {
    id: r.id as string,
    groomerId: (r.groomer_id as string) ?? null,
    name: r.name as string,
    email: r.email as string,
    phone: (r.phone as string) ?? null,
    businessVerification: (r.business_verification as string) ?? null,
    status: (r.status as ClaimStatus) ?? "pending",
    createdAt: r.created_at as string,
  };
}

function toRemoval(r: Record<string, unknown>): DirRemovalRequest {
  return {
    id: r.id as string,
    groomerId: (r.groomer_id as string) ?? null,
    reason: (r.reason as string) ?? null,
    requesterEmail: (r.requester_email as string) ?? null,
    status: (r.status as RemovalStatus) ?? "open",
    createdAt: r.created_at as string,
  };
}

export async function listAllGroomers(limit = 500): Promise<DirGroomer[]> {
  const { data } = await admin().from("dir_groomers").select("*").order("updated_at", { ascending: false }).limit(limit);
  return ((data as Record<string, unknown>[]) ?? []).map(toGroomer);
}

export async function listAllBlogPosts(): Promise<DirBlogPost[]> {
  const { data } = await admin().from("dir_blog_posts").select("*").order("updated_at", { ascending: false });
  return ((data as Record<string, unknown>[]) ?? []).map(toPost);
}

export async function listClaimRequests(): Promise<DirClaimRequest[]> {
  const { data } = await admin().from("dir_claim_requests").select("*").order("created_at", { ascending: false }).limit(200);
  return ((data as Record<string, unknown>[]) ?? []).map(toClaim);
}

export async function listRemovalRequests(): Promise<DirRemovalRequest[]> {
  const { data } = await admin().from("dir_removal_requests").select("*").order("created_at", { ascending: false }).limit(200);
  return ((data as Record<string, unknown>[]) ?? []).map(toRemoval);
}

// ── Sitemap feeds (live/published only) ──────────────────────────────────────

export async function sitemapEntries(): Promise<{
  towns: { slug: string; updatedAt: string }[];
  groomers: { slug: string; updatedAt: string }[];
  schools: { slug: string; updatedAt: string }[];
  posts: { slug: string; updatedAt: string }[];
}> {
  const [{ data: towns }, { data: groomers }, { data: schools }, { data: posts }] = await Promise.all([
    admin().from("dir_towns").select("slug, updated_at"),
    admin().from("dir_groomers").select("slug, updated_at").eq("listing_status", "live"),
    admin().from("dir_schools").select("slug, updated_at"),
    admin().from("dir_blog_posts").select("slug, updated_at").not("published_at", "is", null),
  ]);
  const map = (rows: unknown) =>
    ((rows as { slug: string; updated_at: string }[]) ?? []).map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
  return { towns: map(towns), groomers: map(groomers), schools: map(schools), posts: map(posts) };
}
