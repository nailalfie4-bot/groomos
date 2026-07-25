import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink, Globe, MapPin, Star } from "lucide-react";
import { getGroomerBySlug, getTownById } from "@/lib/directory/data";
import { bookingUrlFor } from "@/lib/directory/types";
import { JsonLd } from "@/components/directory/json-ld";
import { breadcrumbList, localBusiness } from "@/lib/directory/schema";
import { ClaimForm } from "@/components/directory/claim-form";
import { RemovalLink } from "@/components/directory/removal-link";

export const revalidate = 300;

/** Hidden/removed listings never render as a normal page. */
function isRenderable(status: string): boolean {
  return status === "live" || status === "removal_requested";
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const g = await getGroomerBySlug(params.slug).catch(() => null);
  if (!g || !isRenderable(g.listingStatus)) return { title: "Groomer not found" };
  const town = g.townId ? await getTownById(g.townId).catch(() => null) : null;
  const where = town ? ` in ${town.name}` : "";
  const title = g.verified
    ? `${g.name}${where} — Dog Grooming | GroomOS`
    : `${g.name}${where} — Dog Groomer | GroomOS Directory`;
  const description = g.verified
    ? `Book ${g.name}${where} for dog grooming — services, prices, opening hours and reviews.`
    : `${g.name} is a dog groomer${where} listed on the GroomOS directory (unverified listing).`;
  return {
    title,
    description,
    alternates: { canonical: `/groomers/${g.slug}` },
    openGraph: { title, description, url: `/groomers/${g.slug}`, images: g.photos.slice(0, 1) },
  };
}

export default async function GroomerProfile({ params }: { params: { slug: string } }) {
  const g = await getGroomerBySlug(params.slug).catch(() => null);
  if (!g || !isRenderable(g.listingStatus)) notFound();
  const town = g.townId ? await getTownById(g.townId).catch(() => null) : null;
  const bookingUrl = bookingUrlFor(g);
  const priceLines = g.prices.length ? g.prices : g.services;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <JsonLd
        data={[
          breadcrumbList([
            { name: "Directory", path: "/directory" },
            ...(town ? [{ name: `Dog Groomers in ${town.name}`, path: `/dog-groomers-in-${town.slug}` }] : []),
            { name: g.name, path: `/groomers/${g.slug}` },
          ]),
          localBusiness(g, town?.name),
        ]}
      />

      <nav className="mb-4 text-xs text-ink-subtle">
        <Link href="/directory" className="hover:text-ink">Directory</Link>
        {town && (
          <>
            {" · "}
            <Link href={`/dog-groomers-in-${town.slug}`} className="hover:text-ink">
              Dog Groomers in {town.name}
            </Link>
          </>
        )}
        {" · "}
        <span className="text-ink-muted">{g.name}</span>
      </nav>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{g.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {town && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {town.name}
              </span>
            )}
            {g.reviewScore != null && g.reviewCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" /> {g.reviewScore.toFixed(1)} ({g.reviewCount}{" "}
                reviews)
              </span>
            )}
          </div>
        </div>
        {g.groomosUser ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700">
            <BadgeCheck className="h-4 w-4" /> Powered by GroomOS
          </span>
        ) : g.verified ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success-deep">
            <BadgeCheck className="h-4 w-4" /> Verified
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink-subtle">
            Unverified listing
          </span>
        )}
      </div>

      {bookingUrl && (
        <Link
          href={bookingUrl}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-ink-inverse transition-colors hover:bg-accent-600"
        >
          Book now
        </Link>
      )}

      {g.verified ? (
        <>
          {g.photos.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {g.photos.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p}
                  alt={`${g.name} dog grooming photo ${i + 1}`}
                  width={400}
                  height={400}
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          {priceLines.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-ink">Services &amp; prices</h2>
              <ul className="mt-3 divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
                {priceLines.map((s, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink">{s.name}</span>
                    {typeof s.price === "number" && <span className="tabular-nums font-medium text-ink">£{s.price}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {g.openingHours && Object.keys(g.openingHours).length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-ink">Opening hours</h2>
              <ul className="mt-3 divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
                {Object.entries(g.openingHours).map(([day, hrs]) => (
                  <li key={day} className="flex justify-between px-4 py-2 text-sm">
                    <span className="text-ink-muted">{day}</span>
                    <span className="text-ink">{hrs}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(g.websiteUrl || g.socialUrl) && (
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              {g.websiteUrl && (
                <a href={g.websiteUrl} rel="nofollow noopener" target="_blank" className="inline-flex items-center gap-1 text-accent-700 hover:underline">
                  <Globe className="h-4 w-4" /> Website
                </a>
              )}
              {g.socialUrl && (
                <a href={g.socialUrl} rel="nofollow noopener" target="_blank" className="inline-flex items-center gap-1 text-accent-700 hover:underline">
                  <ExternalLink className="h-4 w-4" /> Social
                </a>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-DEFAULT bg-surface p-4 text-sm text-ink-muted">
            <p>
              This is an <span className="font-medium text-ink">unverified listing</span> — it shows only publicly
              available business information. We don&apos;t publish contact details until the owner claims it and
              consents.
            </p>
            {(g.websiteUrl || g.socialUrl) && (
              <div className="mt-3 flex flex-wrap gap-4">
                {g.websiteUrl && (
                  <a href={g.websiteUrl} rel="nofollow noopener" target="_blank" className="inline-flex items-center gap-1 text-accent-700 hover:underline">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {g.socialUrl && (
                  <a href={g.socialUrl} rel="nofollow noopener" target="_blank" className="inline-flex items-center gap-1 text-accent-700 hover:underline">
                    <ExternalLink className="h-4 w-4" /> Social
                  </a>
                )}
              </div>
            )}
          </div>

          <section className="mt-6 rounded-2xl border border-accent/30 bg-accent-50/40 p-5">
            <h2 className="text-lg font-semibold text-ink">Is this your business?</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Claim your profile to add photos, services, prices and a Book Now button.
            </p>
            <div className="mt-4">
              <ClaimForm groomerId={g.id} />
            </div>
          </section>
        </>
      )}

      <div className="mt-10 border-t border-DEFAULT pt-4">
        <RemovalLink groomerId={g.id} />
        <p className="mt-2 text-[11px] text-ink-subtle">
          Listings are compiled from public information. See our{" "}
          <Link href="/directory-information" className="underline hover:text-ink">
            directory information
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
