import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug } from "@/lib/directory/data";
import { JsonLd } from "@/components/directory/json-ld";
import { article, breadcrumbList } from "@/lib/directory/schema";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getPublishedPostBySlug(params.slug).catch(() => null);
  if (!p) return { title: "Article not found" };
  const title = p.metaTitle || `${p.title} | GroomOS`;
  const description = (p.metaDescription || p.excerpt || "").slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${p.slug}`,
      type: "article",
      images: p.heroImage ? [p.heroImage] : undefined,
    },
  };
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const p = await getPublishedPostBySlug(params.slug).catch(() => null);
  if (!p) notFound();
  const paragraphs = (p.body ?? "").split(/\n{2,}/).filter((s) => s.trim());
  const published = p.publishedAt
    ? new Date(p.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <article className="mx-auto max-w-2xl px-4 py-8">
      <JsonLd
        data={[
          breadcrumbList([
            { name: "Directory", path: "/directory" },
            { name: "Blog", path: "/directory" },
            { name: p.title, path: `/blog/${p.slug}` },
          ]),
          article(p),
        ]}
      />

      <nav className="mb-4 text-xs text-ink-subtle">
        <Link href="/directory" className="hover:text-ink">Directory</Link> ·{" "}
        <span className="text-ink-muted">Blog</span>
      </nav>

      <h1 className="text-3xl font-semibold tracking-tight text-ink">{p.title}</h1>
      {published && <p className="mt-2 text-sm text-ink-subtle">{published}</p>}

      {p.heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.heroImage}
          alt={p.title}
          width={1200}
          height={630}
          loading="eager"
          decoding="async"
          className="mt-6 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-ink">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-accent/30 bg-accent-50/40 p-5 text-center">
        <p className="text-sm text-ink-muted">
          Looking for a groomer?{" "}
          <Link href="/directory" className="font-medium text-accent-700">Find a dog groomer near you</Link>.
        </p>
      </section>
    </article>
  );
}
