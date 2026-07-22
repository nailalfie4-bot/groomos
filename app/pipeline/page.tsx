"use client";

/**
 * /pipeline — founder-only sales CRM (access gated in layout.tsx).
 * A self-contained, mobile-first, four-tab app: Today, Pipeline, Plays, Numbers.
 */
import { useState } from "react";
import { BarChart3, BookOpen, Loader2, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipeline, todayISO } from "@/lib/pipeline/use-pipeline";
import type { Prospect } from "@/lib/pipeline/types";
import { ProspectSheet, type SheetState } from "@/components/pipeline/prospect-sheet";
import { TodayTab } from "@/components/pipeline/today-tab";
import { PipelineTab } from "@/components/pipeline/pipeline-tab";
import { PlaysTab } from "@/components/pipeline/plays-tab";
import { NumbersTab } from "@/components/pipeline/numbers-tab";

type Tab = "today" | "pipeline" | "plays" | "numbers";

const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: "today", label: "Today", icon: Zap },
  { id: "pipeline", label: "Pipeline", icon: Users },
  { id: "plays", label: "Plays", icon: BookOpen },
  { id: "numbers", label: "Numbers", icon: BarChart3 },
];

export default function PipelinePage() {
  const api = usePipeline();
  const today = todayISO();
  const [tab, setTab] = useState<Tab>("today");
  const [sheet, setSheet] = useState<SheetState>(null);

  const openEdit = (p: Prospect) => setSheet({ mode: "edit", prospect: p });
  const openAdd = () => setSheet({ mode: "add" });

  // "Done" on a due card: clear the date, then open the editor to set the next step.
  const markDone = (p: Prospect) => {
    api.updateProspect(p.id, { nextActionDate: null });
    setSheet({ mode: "edit", prospect: { ...p, nextActionDate: null } });
  };

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <header className="sticky top-0 z-10 border-b border-DEFAULT bg-canvas/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-ink">Pipeline</h1>
            <p className="text-xs text-ink-muted">Founder outreach CRM · internal</p>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              api.live ? "bg-success-soft text-success-deep" : "bg-surface-sunken text-ink-muted",
            )}
          >
            {api.live ? "Synced" : "Demo"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">
        {api.loading ? (
          <div className="flex items-center justify-center py-24 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {tab === "today" && <TodayTab api={api} today={today} onEdit={openEdit} onDone={markDone} />}
            {tab === "pipeline" && <PipelineTab api={api} today={today} onEdit={openEdit} onAdd={openAdd} />}
            {tab === "plays" && <PlaysTab />}
            {tab === "numbers" && <NumbersTab api={api} today={today} />}
          </>
        )}
      </main>

      {/* Bottom tab bar — thumb-friendly, standalone-safe */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-DEFAULT bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-accent-700" : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-accent")} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <ProspectSheet state={sheet} api={api} onClose={() => setSheet(null)} />
    </div>
  );
}
