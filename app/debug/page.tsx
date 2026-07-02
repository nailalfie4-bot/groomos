"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "pass" | "fail" | "warn" | "unknown";
interface Check {
  id: string;
  label: string;
  status: Status;
  detail: string;
}
interface Health {
  configured: boolean;
  ok?: boolean;
  message?: string;
  usingServiceKey?: boolean;
  checks: Check[];
}

const PILL: Record<Status, { text: string; className: string }> = {
  pass: { text: "PASS", className: "bg-success-soft text-success-deep" },
  fail: { text: "FAIL", className: "bg-danger-soft text-danger-deep" },
  warn: { text: "WARN", className: "bg-warning-soft text-warning-deep" },
  unknown: { text: "—", className: "bg-surface-sunken text-ink-subtle" },
};

export default function DebugPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      setHealth((await res.json()) as Health);
    } catch {
      setHealth({
        configured: true,
        ok: false,
        message: "Couldn't reach /api/health.",
        checks: [],
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="min-h-screen bg-canvas px-5 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-ink-muted transition-colors hover:text-ink">
            ← Home
          </Link>
        </div>

        <div className="rounded-2xl border border-DEFAULT bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Supabase health check
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Stage 2 self-diagnosis. A dev tool — remove <code>/debug</code> and{" "}
            <code>/api/health</code> before a public launch.
          </p>

          {loading && !health && (
            <p className="mt-6 text-sm text-ink-muted">Running checks…</p>
          )}

          {!loading && health && !health.configured && (
            <div className="mt-6 rounded-xl border border-accent/20 bg-accent-50 p-4 text-sm text-ink-muted">
              <span className="font-medium text-ink">Demo mode.</span>{" "}
              {health.message}
            </div>
          )}

          {health && health.configured && (
            <>
              <div
                className={cn(
                  "mt-6 rounded-xl p-3 text-sm font-medium",
                  health.ok ? "bg-success-soft text-success-deep" : "bg-warning-soft text-warning-deep",
                )}
              >
                {health.ok
                  ? "All checks passed — you're ready to test signup."
                  : "Some checks need attention (see below)."}
              </div>

              <ul className="mt-4 flex flex-col gap-3">
                {health.checks.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 rounded-xl border border-DEFAULT p-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide",
                        PILL[c.status].className,
                      )}
                    >
                      {PILL[c.status].text}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{c.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="mt-6"
            onClick={run}
            loading={loading}
          >
            Re-run checks
          </Button>
        </div>
      </div>
    </div>
  );
}
