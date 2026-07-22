"use client";

import { useState } from "react";
import { Check, Copy, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHECKLIST,
  CLOSE,
  DIG_QUESTIONS,
  LADDER,
  OBJECTIONS,
  OPENERS,
  REVEALS,
  type CopyBlock,
} from "@/lib/pipeline/plays";
import { copyText } from "./bits";

export function PlaysTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* The Ladder — the mental model (reference, not copied) */}
      <section>
        <SectionTitle>The Ladder</SectionTitle>
        <div className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
          <ol className="flex flex-col gap-2.5">
            {LADDER.rungs.map((r, i) => (
              <li key={r.name} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{r.name}</p>
                  <p className="text-xs text-ink-muted">{r.hint}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-xs font-medium text-warning-deep">
            {LADDER.rule}
          </p>
        </div>
      </section>

      <Section title="Openers" blocks={OPENERS} />
      <Section title="Dig questions" blocks={DIG_QUESTIONS} />
      <Section title="Reveals" subtitle="Match the one to their signal" blocks={REVEALS} />
      <Section title="The close" blocks={[CLOSE]} />
      <Section title="Objections" blocks={OBJECTIONS} />

      {/* Daily checklist — reference */}
      <section>
        <SectionTitle>
          <ListChecks className="h-4 w-4 text-accent" /> Daily checklist
        </SectionTitle>
        <div className="flex flex-col gap-2.5">
          {CHECKLIST.map((block) => (
            <div key={block.period} className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
              <p className="text-sm font-semibold text-ink">{block.period}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ink-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Section({ title, subtitle, blocks }: { title: string; subtitle?: string; blocks: CopyBlock[] }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {subtitle && <p className="-mt-1.5 mb-2 text-xs text-ink-muted">{subtitle}</p>}
      <div className="flex flex-col gap-2.5">
        {blocks.map((b) => (
          <CopyRow key={b.label} block={b} />
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">{children}</h2>;
}

function CopyRow({ block }: { block: CopyBlock }) {
  const [copied, setCopied] = useState(false);
  async function go() {
    await copyText(block.text, "Copied to clipboard");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={go}
      className={cn(
        "group relative w-full rounded-2xl border p-4 pr-12 text-left transition-colors",
        copied ? "border-success bg-success-soft" : "border-DEFAULT bg-surface shadow-card hover:border-accent",
      )}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{block.label}</p>
      <p className="text-sm leading-relaxed text-ink">{block.text}</p>
      <span
        className={cn(
          "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          copied ? "bg-success text-ink-inverse" : "bg-surface-sunken text-ink-muted group-hover:bg-accent group-hover:text-ink-inverse",
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
