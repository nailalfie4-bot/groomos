"use client";

/**
 * /pipeline/customers — founder-only customer-health dashboard.
 *
 * Access is gated server-side by the pipeline layout (getFounder → 404 for
 * anyone else) and again by the /api/founder/customers route it reads. It shows
 * one row per business — aggregate activity, a red/amber/green health signal,
 * trial countdowns and a "where did they get stuck" timeline — and NOTHING that
 * could expose a customer's password or individual client records.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Globe,
  Loader2,
  LogIn,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerHealth, HealthStatus, PlanLabel } from "@/lib/founder/customer-health";

const HEALTH_META: Record<HealthStatus, { dot: string; ring: string; label: string }> = {
  red: { dot: "bg-danger", ring: "ring-danger/30", label: "Needs help" },
  amber: { dot: "bg-warning", ring: "ring-warning/30", label: "Getting going" },
  green: { dot: "bg-success", ring: "ring-success/30", label: "Thriving" },
};

const PLAN_META: Record<PlanLabel, { label: string; chip: string }> = {
  trial: { label: "Trial", chip: "bg-accent-50 text-accent-700" },
  starter: { label: "Starter", chip: "bg-surface-sunken text-ink-muted" },
  pro: { label: "Pro", chip: "bg-accent-100 text-accent-700" },
  team: { label: "Team", chip: "bg-accent-100 text-accent-700" },
  internal: { label: "Internal", chip: "bg-ink/10 text-ink" },
  expired: { label: "Trial ended", chip: "bg-danger-soft text-danger-deep" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function agoLabel(days: number | null): string {
  if (days === null) return "never";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerHealth[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/founder/customers")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setCustomers(d.customers ?? []);
          setDemo(Boolean(d.demo));
        } else {
          setError(d?.message ?? "Couldn't load customers.");
        }
      })
      .catch(() => setError("Couldn't reach the server."));
  }, []);

  const summary = useMemo(() => {
    const c = customers ?? [];
    return {
      total: c.length,
      red: c.filter((x) => x.health === "red").length,
      amber: c.filter((x) => x.health === "amber").length,
      green: c.filter((x) => x.health === "green").length,
      endingSoon: c.filter((x) => x.trialEndingSoon).length,
    };
  }, [customers]);

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <header className="sticky top-0 z-10 border-b border-DEFAULT bg-canvas/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/pipeline"
              aria-label="Back to pipeline"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink">Customers</h1>
              <p className="text-xs text-ink-muted">Customer health · internal</p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              demo ? "bg-surface-sunken text-ink-muted" : "bg-success-soft text-success-deep",
            )}
          >
            {demo ? "Demo" : "Live"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        {error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft/50 p-4 text-sm text-danger-deep">
            {error}
          </div>
        ) : customers === null ? (
          <div className="flex items-center justify-center gap-2 py-16 text-ink-muted">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading customers…
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-strong bg-surface-sunken px-4 py-12 text-center text-sm text-ink-muted">
            No customers yet. Onboarded accounts will appear here.
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="mb-4 grid grid-cols-4 gap-2">
              <SummaryTile label="Needs help" value={summary.red} dot="bg-danger" strong={summary.red > 0} />
              <SummaryTile label="Getting going" value={summary.amber} dot="bg-warning" />
              <SummaryTile label="Thriving" value={summary.green} dot="bg-success" />
              <SummaryTile
                label="Trial ≤7d"
                value={summary.endingSoon}
                dot="bg-accent"
                strong={summary.endingSoon > 0}
              />
            </div>

            <ul className="flex flex-col gap-3">
              {customers.map((c) => (
                <CustomerCard
                  key={c.businessId}
                  c={c}
                  open={openId === c.businessId}
                  onToggle={() => setOpenId((id) => (id === c.businessId ? null : c.businessId))}
                />
              ))}
            </ul>

            <p className="mt-6 px-1 text-center text-[11px] leading-relaxed text-ink-subtle">
              Read-only. Aggregate activity only — no passwords, no individual client records.
              Sorted so accounts that need help show first.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  dot,
  strong = false,
}: {
  label: string;
  value: number;
  dot: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-2.5 text-center shadow-xs",
        strong ? "border-strong" : "border-DEFAULT",
      )}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span className="tabular-nums text-lg font-semibold leading-none text-ink">{value}</span>
      </div>
      <p className="mt-1 text-[10px] leading-tight text-ink-muted">{label}</p>
    </div>
  );
}

function CustomerCard({
  c,
  open,
  onToggle,
}: {
  c: CustomerHealth;
  open: boolean;
  onToggle: () => void;
}) {
  const hm = HEALTH_META[c.health];
  const pm = PLAN_META[c.plan];
  return (
    <li className="overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
      <button onClick={onToggle} className="w-full px-4 py-3.5 text-left">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4", hm.dot, hm.ring)} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{c.businessName}</p>
              <p className="truncate text-xs text-ink-muted">{c.ownerEmail ?? "no owner email"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", pm.chip)}>
              {pm.label}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 text-ink-subtle transition-transform", open && "rotate-180")}
            />
          </div>
        </div>

        {/* Trial countdown */}
        {c.plan === "trial" && (
          <div
            className={cn(
              "mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium",
              c.trialDaysLeft <= 3
                ? "bg-danger-soft text-danger-deep"
                : c.trialEndingSoon
                  ? "bg-warning-soft text-warning-deep"
                  : "bg-surface-sunken text-ink-muted",
            )}
          >
            <Clock className="h-3 w-3" />
            {c.trialDaysLeft > 0
              ? `${c.trialDaysLeft} day${c.trialDaysLeft === 1 ? "" : "s"} left · ends ${fmtDate(c.trialEndsAt)}`
              : `Trial ends ${fmtDate(c.trialEndsAt)}`}
          </div>
        )}

        {/* Metrics */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Metric icon={<Users className="h-3.5 w-3.5" />} label="Clients" value={c.clientsCount} />
          <Metric icon={<PawPrint className="h-3.5 w-3.5" />} label="Pets" value={c.petsCount} />
          <Metric icon={<CalendarCheck className="h-3.5 w-3.5" />} label="Bookings" value={c.bookingsCount} />
          <Metric icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Done" value={c.completedCount} />
        </div>

        {/* Flags */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Flag on={c.depositsEnabled} icon={<ShieldCheck className="h-3 w-3" />} label="Deposits" />
          <Flag on={c.hasBookingPage} icon={<Globe className="h-3 w-3" />} label="Booking page" />
          <Flag on={c.hasRealOnlineBooking} icon={<Sparkles className="h-3 w-3" />} label="Real booking" />
        </div>

        {/* Last login */}
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-ink-subtle">
          <LogIn className="h-3 w-3" />
          {c.daysSinceLogin === null ? (
            <span className="font-medium text-danger">Never logged in</span>
          ) : (
            <>Last login {agoLabel(c.daysSinceLogin)}</>
          )}
          <span aria-hidden>·</span>
          {c.loginCount} login{c.loginCount === 1 ? "" : "s"} tracked
        </p>
      </button>

      {/* Timeline */}
      {open && (
        <div className="border-t border-DEFAULT bg-surface-sunken/50 px-4 py-3.5">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
            Activity timeline
          </p>
          <ol className="flex flex-col gap-0.5">
            <Milestone done label="Account created" detail={fmtDate(c.signupAt)} />
            <Milestone done={!!c.firstLoginAt} label="First login" detail={c.firstLoginAt ? fmtDate(c.firstLoginAt) : "not yet"} />
            <Milestone done={!!c.firstClientAt} label="First client added" detail={c.firstClientAt ? fmtDate(c.firstClientAt) : "not yet"} />
            <Milestone done={!!c.firstBookingAt} label="First booking created" detail={c.firstBookingAt ? fmtDate(c.firstBookingAt) : "not yet"} />
            <Milestone done={c.hasBookingPage} label="Public booking page live" detail={c.hasBookingPage ? "live" : "not yet"} />
            <Milestone done={c.depositsEnabled} label="Deposits enabled" detail={c.depositsEnabled ? "on" : "off"} />
            <Milestone done={c.hasRealOnlineBooking} label="First online booking received" detail={c.hasRealOnlineBooking ? `${c.onlineBookingsCount} so far` : "not yet"} />
          </ol>
          <p className="mt-3 text-[11px] text-ink-subtle">
            Signed up {fmtDate(c.signupAt)} · {c.health === "red" ? HEALTH_META.red.label : c.health === "amber" ? HEALTH_META.amber.label : HEALTH_META.green.label}
          </p>
        </div>
      )}
    </li>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-sunken px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-ink-subtle">{icon}</div>
      <p className="tabular-nums mt-0.5 text-sm font-semibold leading-none text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] leading-tight text-ink-muted">{label}</p>
    </div>
  );
}

function Flag({ on, icon, label }: { on: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        on ? "bg-success-soft text-success-deep" : "bg-surface-sunken text-ink-subtle",
      )}
    >
      {icon}
      {label}
      <span aria-hidden>{on ? "✓" : "—"}</span>
    </span>
  );
}

function Milestone({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-2 text-sm">
        {done ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-deep" />
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-ink-subtle" />
        )}
        <span className={cn(done ? "text-ink" : "text-ink-muted")}>{label}</span>
      </span>
      <span className={cn("shrink-0 text-xs", done ? "text-ink-muted" : "text-ink-subtle")}>{detail}</span>
    </li>
  );
}
