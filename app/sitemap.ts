import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { sitemapEntries } from "@/lib/directory/data";

export const revalidate = 3600;

/** Only live listings + published posts appear — hidden/removed/draft never do,
 *  so a removed listing drops out of the index automatically. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${base}/directory`, priority: 0.9, changeFrequency: "daily" },
    { url: `${base}/directory-information`, priority: 0.3, changeFrequency: "yearly" },
  ];

  let dir: Awaited<ReturnType<typeof sitemapEntries>> = { towns: [], groomers: [], schools: [], posts: [] };
  try {
    dir = await sitemapEntries();
  } catch {
    // no DB (demo/build without keys) → just the static URLs
  }

  return [
    ...staticUrls,
    ...dir.towns.map((t) => ({ url: `${base}/dog-groomers-in-${t.slug}`, lastModified: t.updatedAt, priority: 0.8, changeFrequency: "weekly" as const })),
    ...dir.groomers.map((g) => ({ url: `${base}/groomers/${g.slug}`, lastModified: g.updatedAt, priority: 0.7, changeFrequency: "weekly" as const })),
    ...dir.schools.map((s) => ({ url: `${base}/grooming-schools/${s.slug}`, lastModified: s.updatedAt, priority: 0.5, changeFrequency: "monthly" as const })),
    ...dir.posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.updatedAt, priority: 0.6, changeFrequency: "monthly" as const })),
  ];
}
