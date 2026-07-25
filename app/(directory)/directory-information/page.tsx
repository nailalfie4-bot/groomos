import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About the GroomOS Directory — Listings, Sources & Removal",
  description:
    "How the GroomOS dog grooming directory works: what it is, where listings come from, and how to claim, correct or remove a listing.",
  alternates: { canonical: "/directory-information" },
};

export default function DirectoryInformation() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">About this directory</h1>

      <div className="mt-6 flex flex-col gap-6 leading-relaxed text-ink-muted">
        <section>
          <h2 className="text-lg font-semibold text-ink">What the directory is</h2>
          <p className="mt-2">
            The GroomOS Directory helps dog owners find local groomers across the UK. It&apos;s run by GroomOS, the
            booking and deposits software for dog groomers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Where listings come from</h2>
          <p className="mt-2">There are two kinds of listing:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium text-ink">Unverified listings</span> are compiled from publicly available
              business information only — business name, town, and a website or social media link. We do{" "}
              <span className="font-medium text-ink">not</span> publish phone numbers, addresses, email addresses or any
              personal data on an unverified listing.
            </li>
            <li>
              <span className="font-medium text-ink">Verified / GroomOS listings</span> are controlled by the groomer
              themselves once they&apos;ve claimed the profile or signed up — including photos, services, prices,
              opening hours and contact details, plus a Book Now button.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Claiming or correcting a listing</h2>
          <p className="mt-2">
            If a listing is your business, use the <span className="font-medium text-ink">Claim this profile</span>{" "}
            button on the profile page. You&apos;ll be able to verify ownership and take full control of what&apos;s
            shown.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Requesting removal</h2>
          <p className="mt-2">
            Every profile has a{" "}
            <span className="font-medium text-ink">&ldquo;Request removal / this isn&apos;t my business&rdquo;</span>{" "}
            link. Use it and we&apos;ll review the request promptly. Once removed, the page is taken down and dropped
            from our sitemap.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Data &amp; privacy</h2>
          <p className="mt-2">
            We take UK GDPR seriously. Because many groomers are sole traders, we treat contact details as personal
            data and never publish them for unverified listings. See our{" "}
            <Link href="/privacy" className="text-accent-700 underline">privacy policy</Link> for more, or contact us via
            the details there.
          </p>
        </section>

        <p>
          <Link href="/directory" className="font-medium text-accent-700">← Back to the directory</Link>
        </p>
      </div>
    </div>
  );
}
