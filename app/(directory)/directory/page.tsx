import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { listTowns, listFeaturedGroomers } from "@/lib/directory/data";
import { GroomerCard } from "@/components/directory/groomer-card";
import { DirectorySearch } from "@/components/directory/search";
import { JsonLd } from "@/components/directory/json-ld";
import { breadcrumbList } from "@/lib/directory/schema";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Find a Dog Groomer Near You | GroomOS Directory",
  description:
    "Search the UK dog grooming directory — compare local groomers by town, see reviews and prices, and book online instantly with GroomOS groomers.",
  alternates: { canonical: "/directory" },
  openGraph: { title: "Find a Dog Groomer Near You", url: "/directory", type: "website" },
};

export default async function DirectoryHome() {
  // Resilient: at build there's no DB, so fall back to empty — real data fills in
  // via ISR + on-demand revalidation once listings exist.
  const [towns, featured] = await Promise.all([
    listTowns().catch(() => []),
    listFeaturedGroomers(6).catch(() => []),
  ]);
  const townName = new Map(towns.map((t) => [t.id, t.name]));
  const featuredTowns = towns.filter((t) => t.groomerCount > 0).slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd data={breadcrumbList([{ name: "Directory", path: "/directory" }])} />

      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">Find a dog groomer near you</h1>
        <p className="mt-3 text-ink-muted">
          Compare local dog groomers across the UK — reviews, services and prices, with instant online booking for
          GroomOS groomers.
        </p>
        <div className="mt-6">
          <DirectorySearch towns={towns.map((t) => ({ name: t.name, slug: t.slug }))} />
        </div>
      </section>

      {featuredTowns.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Browse by town</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {featuredTowns.map((t) => (
              <Link
                key={t.id}
                href={`/dog-groomers-in-${t.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-strong bg-surface px-3.5 py-2 text-sm text-ink transition-colors hover:border-accent hover:text-accent-700"
              >
                <MapPin className="h-4 w-4 text-ink-subtle" /> {t.name}
                <span className="text-xs text-ink-subtle">({t.groomerCount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-ink">Featured groomers</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((g) => (
              <GroomerCard key={g.id} g={g} townName={g.townId ? townName.get(g.townId) : null} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16 rounded-2xl border border-accent/30 bg-accent-50/40 p-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-ink">List your grooming business</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
          Get a free profile, online booking with card deposits, and priority placement in the directory.
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-accent-600"
        >
          List your business <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
