import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GraduationCap, Globe } from "lucide-react";
import { getSchoolBySlug, getTownById } from "@/lib/directory/data";
import { JsonLd } from "@/components/directory/json-ld";
import { breadcrumbList } from "@/lib/directory/schema";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getSchoolBySlug(params.slug).catch(() => null);
  if (!s) return { title: "School not found" };
  const title = `${s.name} — Dog Grooming Courses | GroomOS`;
  const description = (s.description ?? `Dog grooming courses and training at ${s.name}.`).slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `/grooming-schools/${s.slug}` },
    openGraph: { title, description, url: `/grooming-schools/${s.slug}`, type: "website" },
  };
}

export default async function SchoolPage({ params }: { params: { slug: string } }) {
  const s = await getSchoolBySlug(params.slug).catch(() => null);
  if (!s) notFound();
  const town = s.townId ? await getTownById(s.townId).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <JsonLd
        data={breadcrumbList([
          { name: "Directory", path: "/directory" },
          { name: "Grooming schools", path: "/directory" },
          { name: s.name, path: `/grooming-schools/${s.slug}` },
        ])}
      />

      <nav className="mb-4 text-xs text-ink-subtle">
        <Link href="/directory" className="hover:text-ink">Directory</Link> ·{" "}
        <span className="text-ink-muted">{s.name}</span>
      </nav>

      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-accent" />
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{s.name}</h1>
        {s.partner && (
          <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">Partner</span>
        )}
      </div>
      {town && <p className="mt-1 text-sm text-ink-muted">{town.name}</p>}
      {s.description && <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">{s.description}</p>}

      {s.courses.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Courses</h2>
          <ul className="mt-3 divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
            {s.courses.map((c, i) => (
              <li key={i} className="px-4 py-3">
                <p className="font-medium text-ink">{c.name}</p>
                {c.description && <p className="mt-0.5 text-sm text-ink-muted">{c.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        {s.website && (
          <a href={s.website} rel="nofollow noopener" target="_blank" className="inline-flex items-center gap-1 text-accent-700 hover:underline">
            <Globe className="h-4 w-4" /> Visit website
          </a>
        )}
      </div>

      <section className="mt-8 rounded-2xl border border-accent/30 bg-accent-50/40 p-5">
        <h2 className="text-base font-semibold text-ink">Students get GroomOS free</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Training to be a groomer? GroomOS is free for students — get your booking page and directory profile ready
          before you graduate.{" "}
          <Link href="/signup" className="font-medium text-accent-700">Get started</Link>.
        </p>
      </section>
    </div>
  );
}
