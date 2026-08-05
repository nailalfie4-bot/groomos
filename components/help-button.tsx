"use client";

/**
 * The small "?" on each main page. Opens a bottom sheet with the two or three
 * most relevant plain-English answers for that page, plus a link to the full,
 * searchable Help in Settings. Renders nothing if a page has no mapped answers.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { helpForPage } from "@/lib/help/content";

export function HelpButton({ page }: { page: string }) {
  const [open, setOpen] = useState(false);
  const entries = helpForPage(page);
  if (entries.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help for this page"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <HelpCircle className="h-[18px] w-[18px]" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Help" subtitle="Quick answers for this page">
        <div className="flex flex-col gap-3">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl border border-DEFAULT bg-surface-sunken p-4">
              <p className="text-sm font-semibold text-ink">{e.question}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{e.answer}</p>
            </div>
          ))}
          <Link
            href="/settings#help"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 self-start px-1 text-sm font-medium text-accent transition-colors hover:text-accent-600"
          >
            See all help <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Sheet>
    </>
  );
}
