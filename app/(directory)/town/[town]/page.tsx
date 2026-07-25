import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTownBySlug, listLiveGroomersByTown, getNearbyTowns } from "@/lib/directory/data";
import { GroomerCard } from "@/components/directory/groomer-card";
import { JsonLd } from "@/components/directory/json-ld";
import { breadcrumbList, faqPage, townFaqs } from "@/lib/directory/schema";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { town: string } }): Promise<Metadata> {
  const town = await getTownBySlug(params.town).catch(() => null);
  if (!town) return { title: "Town not found" };
  const title = `Dog Groomers in ${town.name} | GroomOS Directory`;
  const description = town.introCopy
    ? town.introCopy.slice(0, 155)
    : `Find and compare dog groomers in ${town.name}${town.county ? `, ${town.county}` : ""} — reviews, services, prices and instant online booking with GroomOS groomers.`;
  const canonical = `/dog-groomers-in-${town.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

export default async function TownPage({ params }: { params: { town: string } }) {
  const town = await getTownBySlug(params.town).catch(() => null);
  if (!town) notFound();

  const [groomers, nearby] = await Promise.all([
    listLiveGroomersByTown(town.id),
    getNearbyTowns(town),
  ]);
  const faqs = townFaqs(town);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <JsonLd
        data={[
          breadcrumbList([
            { name: "Directory", path: "/directory" },
            { name: `Dog Groomers in ${town.name}`, path: `/dog-groomers-in-${town.slug}` },
          ]),
          faqPage(faqs),
        ]}
      />

      <nav className="mb-4 text-xs text-ink-subtle">
        <Link href="/directory" className="hover:text-ink">Directory</Link> ·{" "}
        <span className="text-ink-muted">Dog Groomers in {town.name}</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight text-ink">Dog Groomers in {town.name}</h1>
      {town.county && <p className="mt-1 text-sm text-ink-muted">{town.county}</p>}
      {town.introCopy && <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">{town.introCopy}</p>}

      <section className="mt-8">
        <h2 className="sr-only">Groomers in {town.name}</h2>
        {groomers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-strong bg-surface-sunken p-6 text-sm text-ink-muted">
            We&apos;re still adding groomers in {town.name}.{" "}
            <Link href="/signup" className="font-medium text-accent-700">List your business</Link> to be first.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groomers.map((g) => (
              <GroomerCard key={g.id} g={g} townName={town.name} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Dog grooming in {town.name} — FAQs</h2>
        <dl className="mt-4 space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-DEFAULT bg-surface p-4">
              <dt className="font-medium text-ink">{f.q}</dt>
              <dd className="mt-1 text-sm text-ink-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {nearby.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Nearby towns</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/dog-groomers-in-${t.slug}`}
                  className="inline-block rounded-full border border-strong bg-surface px-3 py-1.5 text-sm text-ink hover:border-accent hover:text-accent-700"
                >
                  Dog groomers in {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
