import Link from "next/link";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingUrlFor, type DirGroomer } from "@/lib/directory/types";

/** One groomer in a town list / featured grid. Only GroomOS users get a Book Now
 *  button — an unverified listing never implies we can take its bookings. */
export function GroomerCard({ g, townName }: { g: DirGroomer; townName?: string | null }) {
  const bookingUrl = bookingUrlFor(g);
  const photo = g.photos[0];
  const services = g.services.slice(0, 3);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
      {photo ? (
        // Photos are compressed to WebP on upload; explicit size + lazy load.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={`${g.name} dog grooming`}
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-accent-50 text-xs font-medium text-accent-700">
          {g.groomosUser ? "GroomOS groomer" : "Listing"}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight text-ink">
            <Link href={`/groomers/${g.slug}`} className="hover:text-accent-700">
              {g.name}
            </Link>
          </h3>
          {g.groomosUser ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
              <BadgeCheck className="h-3.5 w-3.5" /> GroomOS
            </span>
          ) : g.verified ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success-deep">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-subtle">
              Unverified
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {townName && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {townName}
            </span>
          )}
          {g.reviewScore != null && g.reviewCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {g.reviewScore.toFixed(1)} ({g.reviewCount})
            </span>
          )}
        </div>

        {services.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {services.map((s, i) => (
              <li key={i} className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-ink-muted">
                {s.name}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-1">
          {bookingUrl ? (
            <Link
              href={bookingUrl}
              className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-ink-inverse transition-colors hover:bg-accent-600"
            >
              Book now
            </Link>
          ) : (
            <Link
              href={`/groomers/${g.slug}`}
              className={cn(
                "inline-flex w-full items-center justify-center rounded-lg border border-strong px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent-700",
              )}
            >
              View listing
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
