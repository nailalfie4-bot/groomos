/**
 * Directory mutations + admin operations — SERVER-ONLY (service-role).
 *
 * Every function here is called only from founder-gated route handlers. Writes
 * touch `dir_*` tables only (plus a read of one business `slug` — already public
 * — to build a booking URL). On-demand revalidation keeps removals/slug changes
 * effective immediately despite ISR.
 */
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { founderEmail } from "@/lib/auth/founder";
import { SITE_URL } from "@/lib/site";
import { slugify } from "./data";
import type { ListingStatus } from "./types";

const admin = () => createSupabaseAdminClient();

/** Public path for a town listing page (the pretty URL, via the rewrite). */
export const townPath = (slug: string) => `/dog-groomers-in-${slug}`;
export const groomerPath = (slug: string) => `/groomers/${slug}`;

function revalidateGroomer(slug: string, townSlug?: string | null) {
  revalidatePath(groomerPath(slug));
  if (townSlug) revalidatePath(`/town/${townSlug}`); // internal route behind the rewrite
  revalidatePath("/directory");
  revalidatePath("/sitemap.xml");
}

/** A slug unique within a table (appends -2, -3… on collision). */
async function uniqueSlug(table: string, base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "listing";
  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? root : `${root}-${n + 1}`;
    let q = admin().from(table).select("id").eq("slug", slug).limit(1);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
  }
  return `${root}-${Date.now()}`;
}

/** Record a 301 when a slug changes so the old URL never dies. */
async function recordSlugRedirect(fromPath: string, toPath: string) {
  if (fromPath === toPath) return;
  await admin().from("dir_redirects").upsert({ from_path: fromPath, to_path: toPath }, { onConflict: "from_path" });
}

// ── Booking URL: pulled from the linked GroomOS account (public slug only) ────

export async function resolveBookingUrl(businessId: string): Promise<string | null> {
  const { data } = await admin().from("businesses").select("slug").eq("id", businessId).maybeSingle();
  const slug = (data as { slug?: string } | null)?.slug;
  return slug ? `${SITE_URL}/book/${slug}` : null;
}

// ── Groomers ──────────────────────────────────────────────────────────────────

export interface GroomerInput {
  name: string;
  townId?: string | null;
  websiteUrl?: string | null;
  socialUrl?: string | null;
  photos?: string[];
  services?: { name: string; price?: number | null }[];
  prices?: { name: string; price?: number | null }[];
  openingHours?: Record<string, string> | null;
  reviewScore?: number | null;
  reviewCount?: number;
  groomosUser?: boolean;
  groomosBusinessId?: string | null;
  verified?: boolean;
  listingStatus?: ListingStatus;
  source?: string;
  slug?: string;
}

export async function createGroomer(input: GroomerInput): Promise<string> {
  const slug = await uniqueSlug("dir_groomers", input.slug || input.name);
  const bookingUrl = input.groomosBusinessId ? await resolveBookingUrl(input.groomosBusinessId) : null;
  const { data, error } = await admin()
    .from("dir_groomers")
    .insert({
      name: input.name,
      slug,
      town_id: input.townId ?? null,
      website_url: input.websiteUrl ?? null,
      social_url: input.socialUrl ?? null,
      photos: input.photos ?? [],
      services: input.services ?? [],
      prices: input.prices ?? [],
      opening_hours: input.openingHours ?? null,
      review_score: input.reviewScore ?? null,
      review_count: input.reviewCount ?? 0,
      groomos_user: input.groomosUser ?? false,
      groomos_business_id: input.groomosBusinessId ?? null,
      groomos_booking_url: bookingUrl,
      verified: input.verified ?? false,
      listing_status: input.listingStatus ?? "live",
      source: input.source ?? "manual",
    })
    .select("id")
    .single();
  if (error) throw error;
  if (input.townId) await recountTown(input.townId);
  revalidateGroomer(slug);
  return (data as { id: string }).id;
}

export async function updateGroomer(id: string, input: Partial<GroomerInput>): Promise<void> {
  const { data: existing } = await admin()
    .from("dir_groomers")
    .select("slug, town_id, groomos_business_id")
    .eq("id", id)
    .maybeSingle();
  const prev = existing as { slug?: string; town_id?: string | null; groomos_business_id?: string | null } | null;
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.townId !== undefined) patch.town_id = input.townId;
  if (input.websiteUrl !== undefined) patch.website_url = input.websiteUrl;
  if (input.socialUrl !== undefined) patch.social_url = input.socialUrl;
  if (input.photos !== undefined) patch.photos = input.photos;
  if (input.services !== undefined) patch.services = input.services;
  if (input.prices !== undefined) patch.prices = input.prices;
  if (input.openingHours !== undefined) patch.opening_hours = input.openingHours;
  if (input.reviewScore !== undefined) patch.review_score = input.reviewScore;
  if (input.reviewCount !== undefined) patch.review_count = input.reviewCount;
  if (input.groomosUser !== undefined) patch.groomos_user = input.groomosUser;
  if (input.verified !== undefined) patch.verified = input.verified;
  if (input.listingStatus !== undefined) patch.listing_status = input.listingStatus;

  // Booking URL follows the linked business.
  if (input.groomosBusinessId !== undefined) {
    patch.groomos_business_id = input.groomosBusinessId;
    patch.groomos_booking_url = input.groomosBusinessId ? await resolveBookingUrl(input.groomosBusinessId) : null;
  }

  // Slug change → new unique slug + a 301 from the old path.
  let newSlug = prev?.slug ?? "";
  if (input.slug && prev?.slug && slugify(input.slug) !== prev.slug) {
    newSlug = await uniqueSlug("dir_groomers", input.slug, id);
    patch.slug = newSlug;
    await recordSlugRedirect(groomerPath(prev.slug), groomerPath(newSlug));
  }

  const { error } = await admin().from("dir_groomers").update(patch).eq("id", id);
  if (error) throw error;

  for (const t of new Set([prev?.town_id, input.townId].filter(Boolean) as string[])) await recountTown(t);
  if (prev?.slug && prev.slug !== newSlug) revalidateGroomer(prev.slug);
  revalidateGroomer(newSlug || prev?.slug || "");
}

/** Change a listing's status — the one-click removal (410) / hide / restore. */
export async function setGroomerStatus(id: string, status: ListingStatus): Promise<void> {
  const { data } = await admin().from("dir_groomers").select("slug, town_id").eq("id", id).maybeSingle();
  const row = data as { slug?: string; town_id?: string | null } | null;
  const { error } = await admin().from("dir_groomers").update({ listing_status: status }).eq("id", id);
  if (error) throw error;
  if (row?.town_id) await recountTown(row.town_id);
  if (row?.slug) revalidateGroomer(row.slug);
}

export async function deleteGroomer(id: string): Promise<void> {
  const { data } = await admin().from("dir_groomers").select("slug, town_id").eq("id", id).maybeSingle();
  const row = data as { slug?: string; town_id?: string | null } | null;
  const { error } = await admin().from("dir_groomers").delete().eq("id", id);
  if (error) throw error;
  if (row?.town_id) await recountTown(row.town_id);
  if (row?.slug) revalidateGroomer(row.slug);
}

/** Keep a town's denormalised live-listing count fresh. */
export async function recountTown(townId: string): Promise<void> {
  const { count } = await admin()
    .from("dir_groomers")
    .select("id", { count: "exact", head: true })
    .eq("town_id", townId)
    .eq("listing_status", "live");
  await admin().from("dir_towns").update({ groomer_count: count ?? 0 }).eq("id", townId);
}

// ── Towns / schools / blog ────────────────────────────────────────────────────

export async function upsertTown(input: {
  id?: string; name: string; county?: string | null; introCopy?: string | null;
  nearbyTownIds?: string[]; slug?: string;
}): Promise<string> {
  const row: Record<string, unknown> = {
    name: input.name, county: input.county ?? null, intro_copy: input.introCopy ?? null,
    nearby_town_ids: input.nearbyTownIds ?? [],
  };
  if (input.id) {
    if (input.slug) {
      const { data } = await admin().from("dir_towns").select("slug").eq("id", input.id).maybeSingle();
      const prevSlug = (data as { slug?: string } | null)?.slug;
      if (prevSlug && slugify(input.slug) !== prevSlug) {
        const newSlug = await uniqueSlug("dir_towns", input.slug, input.id);
        row.slug = newSlug;
        await recordSlugRedirect(townPath(prevSlug), townPath(newSlug));
        revalidatePath(`/town/${prevSlug}`);
      }
    }
    await admin().from("dir_towns").update(row).eq("id", input.id);
    revalidatePath("/directory");
    return input.id;
  }
  row.slug = await uniqueSlug("dir_towns", input.slug || input.name);
  const { data, error } = await admin().from("dir_towns").insert(row).select("id").single();
  if (error) throw error;
  revalidatePath("/directory");
  return (data as { id: string }).id;
}

export async function deleteTown(id: string): Promise<void> {
  await admin().from("dir_towns").delete().eq("id", id);
  revalidatePath("/directory");
}

export async function upsertSchool(input: {
  id?: string; name: string; description?: string | null; courses?: { name: string; description?: string | null }[];
  website?: string | null; townId?: string | null; partner?: boolean; slug?: string;
}): Promise<string> {
  const row: Record<string, unknown> = {
    name: input.name, description: input.description ?? null, courses: input.courses ?? [],
    website: input.website ?? null, town_id: input.townId ?? null, partner: input.partner ?? false,
  };
  if (input.id) {
    await admin().from("dir_schools").update(row).eq("id", input.id);
    return input.id;
  }
  row.slug = await uniqueSlug("dir_schools", input.slug || input.name);
  const { data, error } = await admin().from("dir_schools").insert(row).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteSchool(id: string): Promise<void> {
  await admin().from("dir_schools").delete().eq("id", id);
}

export async function upsertBlogPost(input: {
  id?: string; title: string; excerpt?: string | null; body?: string | null; heroImage?: string | null;
  publishedAt?: string | null; metaTitle?: string | null; metaDescription?: string | null; slug?: string;
}): Promise<string> {
  const row: Record<string, unknown> = {
    title: input.title, excerpt: input.excerpt ?? null, body: input.body ?? null,
    hero_image: input.heroImage ?? null, published_at: input.publishedAt ?? null,
    meta_title: input.metaTitle ?? null, meta_description: input.metaDescription ?? null,
  };
  if (input.id) {
    if (input.slug) {
      const { data } = await admin().from("dir_blog_posts").select("slug").eq("id", input.id).maybeSingle();
      const prevSlug = (data as { slug?: string } | null)?.slug;
      if (prevSlug && slugify(input.slug) !== prevSlug) {
        const newSlug = await uniqueSlug("dir_blog_posts", input.slug, input.id);
        row.slug = newSlug;
        await recordSlugRedirect(`/blog/${prevSlug}`, `/blog/${newSlug}`);
      }
    }
    await admin().from("dir_blog_posts").update(row).eq("id", input.id);
    revalidatePath(`/blog`);
    return input.id;
  }
  row.slug = await uniqueSlug("dir_blog_posts", input.slug || input.title);
  const { data, error } = await admin().from("dir_blog_posts").insert(row).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteBlogPost(id: string): Promise<void> {
  await admin().from("dir_blog_posts").delete().eq("id", id);
}

// ── CSV bulk import (unverified listings only) ───────────────────────────────

export interface CsvImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

/** Minimal RFC-4180-ish CSV parser (handles quotes + embedded commas/newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

/**
 * Bulk-import UNVERIFIED listings. Only public fields are accepted — name, town,
 * website_url, social_url — never phone/address/email/personal data. Columns are
 * matched by header (case-insensitive). Unknown towns are matched by slug/name;
 * a row with no matching town is still imported with no town (and a warning).
 */
export async function importUnverifiedCsv(text: string): Promise<CsvImportResult> {
  const rows = parseCsv(text);
  if (rows.length < 2) return { inserted: 0, skipped: 0, errors: ["No data rows found."] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iName = col("name");
  const iTown = col("town");
  const iWeb = col("website_url") >= 0 ? col("website_url") : col("website");
  const iSocial = col("social_url") >= 0 ? col("social_url") : col("social");
  if (iName < 0) return { inserted: 0, skipped: 0, errors: ["Missing required 'name' column."] };

  const towns = await admin().from("dir_towns").select("id, slug, name");
  const townList = (towns.data as { id: string; slug: string; name: string }[]) ?? [];
  const townBySlug = new Map(townList.map((t) => [t.slug, t.id]));
  const townByName = new Map(townList.map((t) => [t.name.toLowerCase(), t.id]));

  const result: CsvImportResult = { inserted: 0, skipped: 0, errors: [] };
  const touchedTowns = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const name = (cells[iName] ?? "").trim();
    if (!name) { result.skipped++; result.errors.push(`Row ${r + 1}: blank name.`); continue; }
    const townRaw = iTown >= 0 ? (cells[iTown] ?? "").trim() : "";
    let townId: string | null = null;
    if (townRaw) {
      townId = townBySlug.get(slugify(townRaw)) ?? townByName.get(townRaw.toLowerCase()) ?? null;
      if (!townId) result.errors.push(`Row ${r + 1}: unknown town "${townRaw}" — imported without a town.`);
    }
    try {
      await createGroomer({
        name,
        townId,
        websiteUrl: iWeb >= 0 ? (cells[iWeb] ?? "").trim() || null : null,
        socialUrl: iSocial >= 0 ? (cells[iSocial] ?? "").trim() || null : null,
        verified: false,
        groomosUser: false,
        source: "csv",
      });
      result.inserted++;
      if (townId) touchedTowns.add(townId);
    } catch (e) {
      result.skipped++;
      result.errors.push(`Row ${r + 1}: ${(e as Error).message}`);
    }
  }
  for (const t of touchedTowns) await recountTown(t);
  return result;
}

// ── Claim + removal queues ────────────────────────────────────────────────────

export async function createClaimRequest(input: {
  groomerId: string; name: string; email: string; phone?: string | null; businessVerification?: string | null;
}): Promise<string> {
  const { data, error } = await admin()
    .from("dir_claim_requests")
    .insert({
      groomer_id: input.groomerId, name: input.name, email: input.email,
      phone: input.phone ?? null, business_verification: input.businessVerification ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const to = founderEmail();
  if (to) {
    await sendEmail({
      to,
      subject: `Directory claim: ${input.name}`,
      html: `<p>${escapeHtml(input.name)} (${escapeHtml(input.email)}) wants to claim a listing.</p>`,
    }).catch(() => {});
  }
  return (data as { id: string }).id;
}

export async function createRemovalRequest(input: {
  groomerId: string; reason?: string | null; requesterEmail?: string | null; groomerName?: string;
}): Promise<void> {
  await admin().from("dir_removal_requests").insert({
    groomer_id: input.groomerId, reason: input.reason ?? null, requester_email: input.requesterEmail ?? null,
  });
  // Flag the listing so it surfaces in the admin queue (still live until actioned).
  await admin().from("dir_groomers").update({ listing_status: "removal_requested" }).eq("id", input.groomerId)
    .eq("listing_status", "live");
  const to = founderEmail();
  if (to) {
    await sendEmail({
      to,
      subject: `Directory removal request: ${input.groomerName ?? "a listing"}`,
      html: `<p>A removal was requested for listing <code>${escapeHtml(input.groomerId)}</code>.</p>` +
        (input.reason ? `<p>Reason: ${escapeHtml(input.reason)}</p>` : ""),
    }).catch(() => {});
  }
}

/** Approve/reject a claim. Approving with a businessId links the listing to that
 *  GroomOS account (verified + Book Now), pulling the booking URL from its slug. */
export async function resolveClaim(
  id: string,
  status: "approved" | "rejected",
  opts?: { groomerId?: string; businessId?: string },
): Promise<void> {
  await admin().from("dir_claim_requests").update({ status }).eq("id", id);
  if (status === "approved" && opts?.groomerId && opts?.businessId) {
    await updateGroomer(opts.groomerId, {
      groomosUser: true,
      verified: true,
      groomosBusinessId: opts.businessId,
      listingStatus: "live",
    });
  }
}

/** Action a removal request. 'remove' → 410 the listing; 'dismiss' → keep it live. */
export async function resolveRemoval(id: string, action: "remove" | "dismiss", groomerId?: string): Promise<void> {
  await admin()
    .from("dir_removal_requests")
    .update({ status: action === "remove" ? "actioned" : "dismissed" })
    .eq("id", id);
  if (groomerId) await setGroomerStatus(groomerId, action === "remove" ? "removed" : "live");
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
