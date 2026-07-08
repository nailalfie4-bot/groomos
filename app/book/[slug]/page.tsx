/**
 * Public booking page for one business, resolved by slug: /book/<slug>.
 *
 * Server component — resolves the business + services + settings with the
 * service-role client (no anonymous RLS), then hands them to the interactive
 * client form. Unknown slugs 404.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveBookingPage } from "@/lib/data/public-booking";
import { PublicBooking } from "@/components/public-booking";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await resolveBookingPage(params.slug).catch(() => null);
  if (!data) return { title: "Book a groom · GroomOS" };
  return {
    title: `Book with ${data.business.name} · GroomOS`,
    description: `Book your dog's groom with ${data.business.name} online.`,
  };
}

export default async function BookBySlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await resolveBookingPage(params.slug);
  if (!data) notFound();
  return (
    <PublicBooking
      business={data.business}
      services={data.services}
      settings={data.settings}
    />
  );
}
