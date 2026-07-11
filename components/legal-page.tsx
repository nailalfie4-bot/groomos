import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

/** Shared chrome for the /privacy and /terms pages. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-DEFAULT bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" aria-label="GroomOS home">
            <Logo />
          </Link>
          <Link href="/" className="text-sm text-ink-muted transition-colors hover:text-ink">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <span className="inline-flex items-center rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-700">
          Draft v1 · for your review
        </span>
        <h1 className="mt-4 font-display text-[30px] font-semibold tracking-tight text-ink sm:text-[38px]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-subtle">Last updated {updated}</p>
        <p className="mt-6 text-base leading-relaxed text-ink-muted">{intro}</p>

        <div className="mt-8 flex flex-col gap-8">{children}</div>

        <p className="mt-12 border-t border-DEFAULT pt-6 text-xs leading-relaxed text-ink-subtle">
          This is a plain-English draft (v1) prepared for your review. It is not legal advice — please
          have a solicitor check it against your final data practices before you rely on it.
        </p>
      </main>
    </div>
  );
}

/** A titled section within a legal page. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

/** A tidy bullet list for legal copy. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
