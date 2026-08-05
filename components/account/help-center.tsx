"use client";

/**
 * Searchable Help for Settings — the full list of plain-English answers, filtered
 * as the groomer types, each expandable. Mobile-first.
 */
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchHelp } from "@/lib/help/content";
import { cn } from "@/lib/utils";

export function HelpCenter() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const results = useMemo(() => searchHelp(q), [q]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        leadingIcon={<Search />}
        placeholder="Search help — deposits, booking link, time off…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search help"
      />
      {results.length === 0 ? (
        <p className="rounded-xl bg-surface-sunken p-4 text-sm text-ink-muted">
          No answers matched “{q.trim()}”. Try another word, like “deposit” or “closed”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((e) => {
            const open = openId === e.id;
            return (
              <li key={e.id} className="overflow-hidden rounded-xl border border-DEFAULT bg-surface-sunken">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : e.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <span className="text-sm font-semibold text-ink">{e.question}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-ink-subtle transition-transform", open && "rotate-180")}
                  />
                </button>
                {open && <p className="px-4 pb-4 text-sm leading-relaxed text-ink-muted">{e.answer}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
