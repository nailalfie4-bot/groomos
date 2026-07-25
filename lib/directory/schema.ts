/**
 * JSON-LD builders for the directory (pure). Rendered by <JsonLd> into a
 * <script type="application/ld+json"> tag on the relevant pages.
 */
import { SITE_URL } from "@/lib/site";
import type { DirBlogPost, DirGroomer, DirTown } from "./types";

type Json = Record<string, unknown>;

export function breadcrumbList(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function localBusiness(g: DirGroomer, townName?: string | null): Json {
  const data: Json = {
    "@context": "https://schema.org",
    "@type": "PetGroomer",
    name: g.name,
    url: `${SITE_URL}/groomers/${g.slug}`,
  };
  if (g.websiteUrl) data.sameAs = [g.websiteUrl, g.socialUrl].filter(Boolean);
  if (g.photos.length) data.image = g.photos;
  if (townName) data.areaServed = townName;
  if (g.reviewScore != null && g.reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: g.reviewScore,
      reviewCount: g.reviewCount,
    };
  }
  const priced = g.prices.map((p) => p.price).filter((n): n is number => typeof n === "number" && n > 0);
  if (priced.length) data.priceRange = `£${Math.min(...priced)}–£${Math.max(...priced)}`;
  return data;
}

export function faqPage(faqs: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function article(post: DirBlogPost): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    image: post.heroImage || undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    author: { "@type": "Organization", name: "GroomOS" },
    publisher: { "@type": "Organization", name: "GroomOS" },
  };
}

/** Standard town-page FAQs (kept generic + safe; real intro copy is per-town). */
export function townFaqs(town: DirTown): { q: string; a: string }[] {
  return [
    {
      q: `How much does dog grooming cost in ${town.name}?`,
      a: `Prices in ${town.name} vary by breed, size and coat — a full groom is typically £30–£60. Each groomer below lists their own prices where available.`,
    },
    {
      q: `How do I book a dog groomer in ${town.name}?`,
      a: `Groomers on GroomOS have a Book Now button for instant online booking. For other listings, use the website or social link on their profile.`,
    },
    {
      q: `How often should I get my dog groomed?`,
      a: `Most dogs benefit from a groom every 4–8 weeks depending on their coat. Ask your ${town.name} groomer for a schedule that suits your breed.`,
    },
  ];
}
