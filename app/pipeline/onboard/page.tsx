"use client";

/**
 * /pipeline/onboard — founder-only (inherits the /pipeline gate). Prepare a
 * groomer's account in advance, then send a single-use invite so they claim it
 * and set their own password. Shows invite status so you can see who hasn't yet.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  demoInvites,
  displayStatus,
  rowToInvite,
  type Invite,
  type InviteRow,
  type InviteStatus,
  type ServiceDraft,
} from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<InviteStatus, string> = {
  sent: "bg-accent-50 text-accent-700",
  accepted: "bg-success-soft text-success-deep",
  expired: "bg-danger-soft text-danger-deep",
};
const STATUS_LABEL: Record<InviteStatus, string> = { sent: "Invite sent", accepted: "Accepted", expired: "Expired" };

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function OnboardPage() {
  const live = isSupabaseConfigured();
  const [invites, setInvites] = useState<Invite[]>(() => (live ? [] : demoInvites()));
  const [loadingInvites, setLoadingInvites] = useState(live);
  const [busyResend, setBusyResend] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("Gtr Manchester");
  const [depositEnabled, setDepositEnabled] = useState(true);
  const [depositAmount, setDepositAmount] = useState(10);
  const [terms, setTerms] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([
    { name: "Full Groom", priceGBP: 45, durationMin: 90 },
    { name: "Bath & Tidy", priceGBP: 30, durationMin: 60 },
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!live) return;
    try {
      const sb = createSupabaseBrowserClient();
      const { data } = await sb
        .from("onboarding_invites")
        .select("*")
        .order("sent_at", { ascending: false });
      setInvites(((data as InviteRow[] | null) ?? []).map(rowToInvite));
    } finally {
      setLoadingInvites(false);
    }
  }, [live]);
  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const setService = (i: number, patch: Partial<ServiceDraft>) =>
    setServices((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addService = () => setServices((s) => [...s, { name: "", priceGBP: 0, durationMin: 60 }]);
  const removeService = (i: number) => setServices((s) => s.filter((_, idx) => idx !== i));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!businessName.trim() || !email.trim()) {
      setError("A business name and the owner's email are required.");
      return;
    }
    setSending(true);

    // Demo mode has no Supabase admin — simulate so the flow is visible.
    if (!live) {
      const now = Date.now();
      setInvites((prev) => [
        {
          id: `demo-${now}`,
          email: email.trim(),
          businessName: businessName.trim(),
          status: "sent",
          sentAt: new Date(now).toISOString(),
          acceptedAt: null,
          expiresAt: new Date(now + 7 * 86_400_000).toISOString(),
        },
        ...prev,
      ]);
      toast("Demo — invite simulated", { description: "The live app creates the account and emails the link." });
      setBusinessName("");
      setEmail("");
      setTerms("");
      setSending(false);
      return;
    }

    try {
      const res = await fetch("/api/pipeline/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessName,
          ownerEmail: email,
          area,
          depositEnabled,
          depositAmount,
          termsText: terms,
          services: services.filter((s) => s.name.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Couldn't send the invite. Please try again.");
        setSending(false);
        return;
      }
      toast.success(`Invite sent to ${email}`, {
        description: data.emailSkipped
          ? "Account created — but email isn't switched on, so the link wasn't sent."
          : "They'll get an email to set their own password.",
      });
      setBusinessName("");
      setEmail("");
      setTerms("");
      await loadInvites();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function resend(inv: Invite) {
    if (!live) {
      toast("Demo — resend simulated");
      return;
    }
    setBusyResend(inv.id);
    try {
      const res = await fetch("/api/pipeline/onboard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "resend", inviteId: inv.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.message ?? "Couldn't resend the invite.");
        return;
      }
      toast.success(`Fresh invite sent to ${inv.email}`);
      await loadInvites();
    } finally {
      setBusyResend(null);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <header className="sticky top-0 z-10 border-b border-DEFAULT bg-canvas/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/pipeline"
            className="mb-1 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Pipeline
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-ink">Onboard a client</h1>
          <p className="text-xs text-ink-muted">
            Prepare the account, then invite them to claim it and set their own password.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-5">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <section className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-ink">Business</h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Business name"
                placeholder="Paws & Co. Grooming"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <Input
                label="Owner email"
                type="email"
                autoCapitalize="none"
                placeholder="owner@theirbusiness.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input label="Area" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
          </section>

          <section className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Services &amp; prices</h2>
              <button
                type="button"
                onClick={addService}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-600"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {services.map((s, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label={i === 0 ? "Service" : undefined}
                      placeholder="Full Groom"
                      value={s.name}
                      onChange={(e) => setService(i, { name: e.target.value })}
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      label={i === 0 ? "£" : undefined}
                      type="number"
                      inputMode="numeric"
                      value={String(s.priceGBP)}
                      onChange={(e) => setService(i, { priceGBP: Number(e.target.value) })}
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      label={i === 0 ? "Mins" : undefined}
                      type="number"
                      inputMode="numeric"
                      value={String(s.durationMin)}
                      onChange={(e) => setService(i, { durationMin: Number(e.target.value) })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    aria-label="Remove service"
                    className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-strong text-ink-muted hover:border-danger hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-ink">Deposit &amp; terms</h2>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">
                Take a {depositEnabled ? `£${depositAmount}` : ""} deposit
              </span>
              <Toggle checked={depositEnabled} onChange={setDepositEnabled} label="Require a deposit" />
            </div>
            {depositEnabled && (
              <div className="mt-3 w-28">
                <Input
                  label="Deposit £"
                  type="number"
                  inputMode="numeric"
                  value={String(depositAmount)}
                  onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            )}
            <div className="mt-4">
              <Textarea
                label="Terms &amp; conditions (optional)"
                placeholder="Deposits are non-refundable within 48 hours…"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </section>

          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" loading={sending} className="w-full">
            <Send className="h-4 w-4" /> Create account &amp; send invite
          </Button>
        </form>

        {/* Invite status */}
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-ink">Invites</h2>
          {loadingInvites ? (
            <div className="flex items-center justify-center py-10 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : invites.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-strong bg-surface-sunken px-4 py-8 text-center text-sm text-ink-muted">
              No invites yet. Create an account above to send your first one.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {invites.map((inv) => {
                const st = displayStatus(inv);
                return (
                  <li
                    key={inv.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{inv.businessName}</p>
                      <p className="truncate text-xs text-ink-muted">{inv.email}</p>
                      <p className="mt-1 text-[11px] text-ink-subtle">
                        Sent {fmt(inv.sentAt)}
                        {st === "accepted" && inv.acceptedAt
                          ? ` · accepted ${fmt(inv.acceptedAt)}`
                          : ` · ${st === "expired" ? "expired" : "expires"} ${fmt(inv.expiresAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[st])}>
                        {STATUS_LABEL[st]}
                      </span>
                      {st !== "accepted" && (
                        <button
                          onClick={() => resend(inv)}
                          disabled={busyResend === inv.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:bg-accent-50 disabled:opacity-50"
                        >
                          {busyResend === inv.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Resend
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
