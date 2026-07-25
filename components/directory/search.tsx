"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

/** Town finder — filters the town list client-side and links to town pages. */
export function DirectorySearch({ towns }: { towns: { name: string; slug: string }[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const matches = term ? towns.filter((t) => t.name.toLowerCase().includes(term)).slice(0, 6) : [];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-strong bg-surface px-3.5 py-3 shadow-card">
        <Search className="h-5 w-5 shrink-0 text-ink-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a dog groomer near you — enter your town"
          aria-label="Search for a town"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </div>
      {matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-DEFAULT bg-surface shadow-md">
          {matches.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/dog-groomers-in-${t.slug}`}
                className="block px-4 py-2.5 text-sm text-ink hover:bg-surface-sunken"
              >
                Dog groomers in {t.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
