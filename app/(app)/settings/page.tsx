"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  Building2,
  CalendarClock,
  Check,
  Clock,
  Copy,
  CreditCard,
  Heart,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/mock/store";
import { computeQuote } from "@/lib/pricing";
import { formatGBP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Business, Settings } from "@/lib/types";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00–21:00
const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default function SettingsPage() {
  const { settings, business, updateSettings, updateBusiness, hydrated } = useStore();
  // Mount the form only once the tenant's real settings/business have loaded, so
  // its fields initialise from actual values rather than the pre-load defaults.
  if (!hydrated) return <SettingsSkeleton />;
  return (
    <SettingsForm
      settings={settings}
      business={business}
      updateSettings={updateSettings}
      updateBusiness={updateBusiness}
    />
  );
}

function SettingsForm({
  settings,
  business,
  updateSettings,
  updateBusiness,
}: {
  settings: Settings;
  business: Business;
  updateSettings: (patch: Partial<Settings>) => void;
  updateBusiness: (patch: Partial<Business>) => void;
}) {
  const [s, setS] = useState<Settings>(settings);
  const [b, setB] = useState<Business>(business);

  const dirty =
    JSON.stringify(s) !== JSON.stringify(settings) ||
    JSON.stringify(b) !== JSON.stringify(business);

  function setSet<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((f) => ({ ...f, [key]: value }));
  }
  function setBiz<K extends keyof Business>(key: K, value: Business[K]) {
    setB((f) => ({ ...f, [key]: value }));
  }
  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  function save() {
    updateSettings(s);
    updateBusiness(b);
    toast.success("Settings saved");
  }

  // Live matting-meter example, updates as fees change.
  const preview = useMemo(
    () => computeQuote({ priceGBP: 45, durationMin: 90 }, "giant", "matted", s),
    [s],
  );

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="The few choices that make GroomOS smart — change them any time."
        actions={
          <Button size="sm" onClick={save} disabled={!dirty}>
            <Check className="h-4 w-4" />
            Save
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Business */}
        <Section icon={<Building2 className="h-[18px] w-[18px]" />} title="Your business" description="Shown to clients on your booking page and receipts.">
          <div className="flex flex-col gap-3">
            <Input label="Business name" value={b.name} onChange={(e) => setBiz("name", e.target.value)} />
            <BookingLinkField slug={b.slug ?? ""} onChange={(v) => setBiz("slug", v)} />
            <Input label="Phone" value={b.phone} onChange={(e) => setBiz("phone", e.target.value)} />
            <Input label="Address" value={b.addressLine} onChange={(e) => setBiz("addressLine", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Town / city" value={b.city} onChange={(e) => setBiz("city", e.target.value)} />
              <Input label="Postcode" value={b.postcode} onChange={(e) => setBiz("postcode", e.target.value)} />
            </div>
          </div>
        </Section>

        {/* Opening hours */}
        <Section
          icon={<CalendarClock className="h-[18px] w-[18px]" />}
          title="Working hours"
          description="Sets the range your calendar board shows and what clients can book."
        >
          <div className="grid max-w-sm grid-cols-2 gap-3">
            <Select label="Opens" value={String(b.openHour)} onChange={(e) => setBiz("openHour", num(e.target.value))}>
              {HOURS.filter((h) => h < b.closeHour).map((h) => (
                <option key={h} value={h}>{hhmm(h)}</option>
              ))}
            </Select>
            <Select label="Closes" value={String(b.closeHour)} onChange={(e) => setBiz("closeHour", num(e.target.value))}>
              {HOURS.filter((h) => h > b.openHour).map((h) => (
                <option key={h} value={h}>{hhmm(h)}</option>
              ))}
            </Select>
          </div>
        </Section>

        {/* Deposits & no-show protection */}
        <Section
          icon={<ShieldCheck className="h-[18px] w-[18px]" />}
          title="Deposits & no-show protection"
          description="Take a small deposit to confirm a booking — applied to the groom, or kept if they don't show."
          action={<Toggle checked={s.depositEnabled} onChange={(v) => setSet("depositEnabled", v)} label="Require deposits" />}
        >
          <div className={cn("grid max-w-sm grid-cols-2 gap-3 transition-opacity", !s.depositEnabled && "pointer-events-none opacity-50")}>
            <Input
              label="Deposit amount (£)"
              type="number"
              min={0}
              step={1}
              value={String(s.depositAmount)}
              onChange={(e) => setSet("depositAmount", num(e.target.value))}
            />
            <Select
              label="Free cancellation up to"
              value={String(s.cancellationNoticeHours)}
              onChange={(e) => setSet("cancellationNoticeHours", num(e.target.value))}
            >
              <option value="24">24 hours before</option>
              <option value="48">48 hours before</option>
              <option value="72">72 hours before</option>
            </Select>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-50 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" />
            <p className="text-sm text-accent-700">
              Clients pay <span className="font-semibold tabular-nums">{formatGBP(s.depositAmount)}</span> to confirm, free to cancel up to{" "}
              <span className="font-semibold">{s.cancellationNoticeHours}h</span> before. No-shows add up fast — deposits help you stop quietly losing money to them.
            </p>
          </div>
          <ConnectPayouts enabled={s.depositEnabled} amount={s.depositAmount} />
        </Section>

        {/* Cleanup buffer */}
        <Section
          icon={<Clock className="h-[18px] w-[18px]" />}
          title="Cleanup time"
          description="Added automatically after every dog so you're never rushed — and never double-booked."
        >
          <div className="max-w-xs">
            <Input
              label="Minutes between dogs"
              type="number"
              min={0}
              step={5}
              value={String(s.bufferMin)}
              onChange={(e) => setSet("bufferMin", num(e.target.value))}
              leadingIcon={<Clock />}
            />
          </div>
        </Section>

        {/* Matting meter */}
        <Section
          icon={<Heart className="h-[18px] w-[18px]" />}
          title="Matting meter"
          description="Fair, automatic surcharges for tricky coats and big dogs — added to price and time, explained kindly to owners."
        >
          <div className="flex flex-col gap-3">
            <FeeRow title="A bit tangled" fee={s.tangledFee} mins={s.tangledExtraMin} onFee={(v) => setSet("tangledFee", v)} onMins={(v) => setSet("tangledExtraMin", v)} />
            <FeeRow title="Matted / pelted" fee={s.mattedFee} mins={s.mattedExtraMin} onFee={(v) => setSet("mattedFee", v)} onMins={(v) => setSet("mattedExtraMin", v)} />
            <FeeRow title="Giant breed" fee={s.giantFee} mins={s.giantExtraMin} onFee={(v) => setSet("giantFee", v)} onMins={(v) => setSet("giantExtraMin", v)} />
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-accent-50 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" />
            <p className="text-sm text-accent-700">
              For example, a matted, giant Full Groom comes to{" "}
              <span className="font-semibold tabular-nums">{formatGBP(preview.totalPriceGBP)}</span> over{" "}
              <span className="font-semibold tabular-nums">{preview.totalDurationMin} min</span> — with{" "}
              {formatGBP(preview.mattingFee + preview.sizeFee)} and {preview.mattingExtraMin + preview.sizeExtraMin} extra minutes set aside for care.
            </p>
          </div>
        </Section>

        {/* Rebooking */}
        <Section
          icon={<RefreshCw className="h-[18px] w-[18px]" />}
          title="Rebooking"
          description="We'll flag a dog as “due for a groom” once it's been this long since their last visit."
        >
          <div className="max-w-xs">
            <Input
              label="Default weeks between grooms"
              type="number"
              min={1}
              step={1}
              value={String(s.defaultRebookWeeks)}
              onChange={(e) => setSet("defaultRebookWeeks", num(e.target.value))}
            />
          </div>
        </Section>

        {/* Reminders — the selling point */}
        <Section icon={<Bell className="h-[18px] w-[18px]" />} title="Reminders" description="Automatic email reminders before every appointment. SMS coming soon." action={<Badge tone="success" dot>Email · included</Badge>}>
          <p className="rounded-xl bg-surface-sunken p-3 text-sm text-ink-muted">
            Appointment reminders and booking confirmations go out by email automatically —
            included in your plan, with no per-message fees.
          </p>
        </Section>
      </div>

      {/* Unsaved changes bar */}
      {dirty && (
        <div className="sticky bottom-20 z-20 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-surface/95 p-3 pl-4 shadow-lg backdrop-blur md:bottom-4">
          <span className="text-sm font-medium text-ink">You have unsaved changes</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setS(settings); setB(business); }}>
              Discard
            </Button>
            <Button size="sm" onClick={save}>
              <Check className="h-4 w-4" />
              Save changes
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Connect-your-Stripe control inside the Deposits section. Talks to the real
 * /api/stripe/connect endpoint (server-authed), so it works even though the
 * rest of this screen is store-driven. Until the account can take charges,
 * deposits are "recorded only" — agreed with the client, not charged online.
 */
function ConnectPayouts({ enabled, amount }: { enabled: boolean; amount: number }) {
  const { configured } = useAuth();
  const [status, setStatus] = useState<{ connected: boolean; chargesEnabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect");
      if (!res.ok) {
        setStatus(null);
        return;
      }
      const d = await res.json();
      setStatus({ connected: Boolean(d.connected), chargesEnabled: Boolean(d.chargesEnabled) });
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    // Returning from Stripe onboarding (?connect=done|refresh) — tidy the URL.
    if (new URLSearchParams(window.location.search).get("connect")) {
      window.history.replaceState(null, "", "/settings");
    }
    refresh();
  }, [configured, refresh]);

  async function connect() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const d = await res.json();
      if (res.ok && d.url) {
        window.location.assign(d.url);
        return;
      }
      toast.error(
        d.error === "billing_not_configured"
          ? "Payments aren't set up on this account yet."
          : "Couldn't start Stripe setup — please try again.",
      );
    } catch {
      toast.error("Couldn't reach Stripe — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) return null;

  if (!configured) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-DEFAULT bg-surface-sunken p-3 text-sm text-ink-muted">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
        On a live account you connect your Stripe here to charge deposits automatically. In this demo, deposits are shown but not charged.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-3 flex h-12 items-center gap-2 rounded-xl border border-DEFAULT bg-surface-sunken px-3 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your Stripe connection…
      </div>
    );
  }

  if (status?.chargesEnabled) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-success/30 bg-success-soft p-3 text-sm text-success-deep">
        <Check className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Stripe connected — card deposits are live.</p>
          <p className="mt-0.5 opacity-80">
            Clients are charged <span className="font-semibold tabular-nums">{formatGBP(amount)}</span> at booking,
            straight into your own Stripe account.
          </p>
        </div>
      </div>
    );
  }

  const partial = Boolean(status?.connected); // account exists, onboarding unfinished
  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent-50 p-3">
      <div className="flex items-start gap-2 text-sm text-accent-700">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">
            {partial ? "Finish connecting Stripe to charge deposits" : "Connect Stripe to charge deposits"}
          </p>
          <p className="mt-0.5">
            Until then, deposits are <span className="font-semibold">recorded only</span> — agreed with your client and collected by you, not charged online.
          </p>
        </div>
      </div>
      <Button size="sm" className="mt-3" loading={busy} disabled={busy} onClick={connect}>
        <CreditCard className="h-4 w-4" />
        {partial ? "Continue Stripe setup" : "Connect Stripe"}
      </Button>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-DEFAULT bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-ink-muted">
            {icon}
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FeeRow({
  title,
  fee,
  mins,
  onFee,
  onMins,
}: {
  title: string;
  fee: number;
  mins: number;
  onFee: (v: number) => void;
  onMins: (v: number) => void;
}) {
  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-DEFAULT bg-surface-sunken p-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 items-center gap-2">
        <Heart className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium text-ink">{title}</span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <Input label="Extra charge (£)" type="number" min={0} step={1} value={String(fee)} onChange={(e) => onFee(num(e.target.value))} />
        <Input label="Extra time (min)" type="number" min={0} step={5} value={String(mins)} onChange={(e) => onMins(num(e.target.value))} />
      </div>
    </div>
  );
}

/** Mirrors the DB slugify(): lowercase, non-alphanumerics → hyphen, trimmed. */
function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug input + a copyable public booking link (/book/<slug>). */
function BookingLinkField({
  slug,
  onChange,
}: {
  slug: string;
  onChange: (v: string) => void;
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  async function copy() {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(`${origin}/book/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        label="Booking link"
        value={slug}
        onChange={(e) => onChange(slugify(e.target.value))}
        placeholder="your-salon"
        hint="Your public booking page. Letters, numbers and hyphens; must be unique."
        leadingIcon={<Link2 />}
      />
      {slug && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken px-3 py-2">
          <span className="truncate text-xs text-ink-muted">
            {origin ? `${origin}/book/${slug}` : `/book/${slug}`}
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent-700 transition-colors hover:bg-accent-50"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="The few choices that make GroomOS smart — change them any time."
      />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </>
  );
}
