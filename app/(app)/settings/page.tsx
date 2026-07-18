"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarClock,
  Check,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Gauge,
  Heart,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeader } from "@/components/page-header";
import { BusinessLogo } from "@/components/business-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/mock/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resizeImageToSquare } from "@/lib/image";
import { canUseGroomers } from "@/lib/trial";
import { computeQuote } from "@/lib/pricing";
import { formatGBP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Business, Declaration, DeclarationScale, Settings } from "@/lib/types";

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

  // The logo is uploaded immediately (see LogoUpload), so persist it straight
  // away rather than waiting for Save — and keep the local form copy in sync.
  function setLogo(url: string) {
    setB((f) => ({ ...f, logoUrl: url || undefined }));
    updateBusiness({ logoUrl: url });
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

      <div className="flex flex-col gap-9">
        {/* ── Your business ──────────────────────────────────────────────── */}
        <SettingsGroup title="Your business">
          <Section icon={<Building2 className="h-[18px] w-[18px]" />} title="Business details" description="Shown to clients on your booking page, confirmations and receipts.">
            <div className="flex flex-col gap-4">
              <LogoUpload name={b.name} logoUrl={b.logoUrl} onChange={setLogo} />
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
        </SettingsGroup>

        {/* ── Your team ──────────────────────────────────────────────────── */}
        <SettingsGroup title="Your team">
          <Section
            icon={<Users className="h-[18px] w-[18px]" />}
            title="Groomers"
            description="Add the groomers who work with you, then assign each booking to one. Filter the calendar by groomer to see just their day."
          >
            <GroomersSection />
          </Section>
        </SettingsGroup>

        {/* ── Services & pricing ─────────────────────────────────────────── */}
        <SettingsGroup title="Services & pricing">
          <Section icon={<Scissors className="h-[18px] w-[18px]" />} title="Services & add-ons" description="Your grooms and the extras clients can add — priced and timed.">
            <Link
              href="/services"
              className="flex items-center justify-between gap-3 rounded-xl border border-DEFAULT bg-surface-sunken p-4 transition-colors hover:border-accent"
            >
              <span className="text-sm text-ink">Manage your services &amp; add-ons</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-subtle" />
            </Link>
          </Section>

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
        </SettingsGroup>

        {/* ── Bookings & availability ────────────────────────────────────── */}
        <SettingsGroup title="Bookings & availability">
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
        </SettingsGroup>

        {/* ── Deposits & payments ────────────────────────────────────────── */}
        <SettingsGroup title="Deposits & payments">
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
        </SettingsGroup>

        {/* ── Client checks ──────────────────────────────────────────────── */}
        <SettingsGroup title="Client checks">
          <Section
            icon={<Gauge className="h-[18px] w-[18px]" />}
            title="Coat & temperament scales"
            description="Clients self-declare their dog's coat and temperament on a visual scale at booking. Turn off any level you don't take online — clients who pick it are asked to contact you first."
          >
            <div className="flex flex-col gap-4">
              <ScaleEditor heading="Coat / matting" value={s.mattingScale} onChange={(v) => setSet("mattingScale", v)} />
              <ScaleEditor heading="Temperament" value={s.temperamentScale} onChange={(v) => setSet("temperamentScale", v)} />
            </div>
          </Section>

          <Section
            icon={<ClipboardList className="h-[18px] w-[18px]" />}
            title="Client declarations"
            description="Short yes/no confirmations clients must tick before booking. Toggle any off, or edit the wording."
          >
            <DeclarationsEditor value={s.declarations} onChange={(d) => setSet("declarations", d)} />
          </Section>

          <Section
            icon={<FileText className="h-[18px] w-[18px]" />}
            title="Terms & conditions"
            description="Paste your own terms — cancellation policy, late arrivals, anything. Leave blank to skip."
          >
            <Textarea
              label="Your terms"
              rows={6}
              value={s.termsText}
              onChange={(e) => setSet("termsText", e.target.value)}
              placeholder="e.g. Deposits are non-refundable within 48 hours of the appointment. Please arrive on time — arrivals more than 15 minutes late may need to rebook…"
            />
            {s.termsText.trim() ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent-50 p-3 text-sm text-accent-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Clients tick “I agree” and type their name to sign. The exact text, their name and the time are stored with every booking as your proof.
              </p>
            ) : (
              <p className="mt-2 text-xs text-ink-subtle">
                No terms yet — the agreement step won&apos;t show on your booking page.
              </p>
            )}
          </Section>
        </SettingsGroup>

        {/* ── Reminders & notifications ──────────────────────────────────── */}
        <SettingsGroup title="Reminders & notifications">
          <Section icon={<Bell className="h-[18px] w-[18px]" />} title="Reminders" description="Automatic email reminders before every appointment. SMS coming soon." action={<Badge tone="success" dot>Email · included</Badge>}>
            <p className="rounded-xl bg-surface-sunken p-3 text-sm text-ink-muted">
              Appointment reminders and booking confirmations go out by email automatically —
              included in your plan, with no per-message fees.
            </p>
          </Section>
        </SettingsGroup>
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
          : d.message || "Couldn't start Stripe setup — please try again.",
        d.message ? { description: [d.type, d.code].filter(Boolean).join(" · ") || undefined } : undefined,
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

/** Inline editor for the client-declarations list: toggle + editable label + add/remove. */
function DeclarationsEditor({
  value,
  onChange,
}: {
  value: Declaration[];
  onChange: (d: Declaration[]) => void;
}) {
  const update = (id: string, patch: Partial<Declaration>) =>
    onChange(value.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: string) => onChange(value.filter((d) => d.id !== id));
  const add = () =>
    onChange([
      ...value,
      { id: `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, label: "", enabled: true },
    ]);

  return (
    <div className="flex flex-col gap-2.5">
      {value.length === 0 ? (
        <p className="rounded-xl bg-surface-sunken p-3 text-sm text-ink-muted">
          No declarations — clients won&apos;t be asked to confirm anything before booking.
        </p>
      ) : (
        value.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-2.5 rounded-xl border border-DEFAULT bg-surface-sunken p-2.5 pl-3"
          >
            <Toggle
              checked={d.enabled}
              onChange={(v) => update(d.id, { enabled: v })}
              label="Require this declaration"
            />
            <input
              value={d.label}
              onChange={(e) => update(d.id, { label: e.target.value })}
              placeholder="e.g. My dog is up to date on their vaccinations"
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle",
                !d.enabled && "text-ink-muted line-through",
              )}
            />
            <button
              type="button"
              onClick={() => remove(d.id)}
              aria-label="Remove declaration"
              className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-600"
      >
        <Plus className="h-4 w-4" /> Add declaration
      </button>
    </div>
  );
}

/** Editor for one declaration scale: on/off, the client-facing question, and a
 *  per-level "accepted" toggle. Level wording is fixed; acceptance is the lever. */
function ScaleEditor({
  heading,
  value,
  onChange,
}: {
  heading: string;
  value: DeclarationScale;
  onChange: (s: DeclarationScale) => void;
}) {
  const setLevel = (id: string, accepted: boolean) =>
    onChange({ ...value, levels: value.levels.map((l) => (l.id === id ? { ...l, accepted } : l)) });
  return (
    <div className="rounded-xl border border-DEFAULT bg-surface-sunken p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{heading}</span>
        <Toggle
          checked={value.enabled}
          onChange={(v) => onChange({ ...value, enabled: v })}
          label={`Show the ${heading} scale`}
        />
      </div>
      <div className={cn("flex flex-col gap-3 transition-opacity", !value.enabled && "pointer-events-none opacity-50")}>
        <Input
          label="Question shown to clients"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
        <div className="flex flex-col gap-2">
          {value.levels.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border border-DEFAULT bg-surface p-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{l.label}</p>
                <p className="text-xs text-ink-muted">{l.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-0.5">
                <Toggle checked={l.accepted} onChange={(v) => setLevel(l.id, v)} label={`Accept ${l.label}`} />
                <span className="text-[10px] font-medium text-ink-subtle">{l.accepted ? "Accepted" : "Contact me"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Preset groomer colours — calm, distinct, on-brand. */
const GROOMER_COLOURS = [
  "#C9756B", "#6B8FC9", "#7CA982", "#C99B6B",
  "#9B6BC9", "#C96B9B", "#5FA8A0", "#B0894F",
];

/** A colour dot that cycles to the next preset on tap (no popover needed). */
function CycleColourDot({ colour, onChange }: { colour: string; onChange: (c: string) => void }) {
  return (
    <button
      type="button"
      title="Tap to change colour"
      aria-label="Groomer colour"
      onClick={() => {
        const i = GROOMER_COLOURS.indexOf(colour);
        onChange(GROOMER_COLOURS[(i + 1) % GROOMER_COLOURS.length]);
      }}
      className="h-6 w-6 shrink-0 rounded-full border border-black/10 transition-transform active:scale-90"
      style={{ backgroundColor: colour }}
    />
  );
}

/** Manage the business's groomers (Pro/Team). Assigns colours for the calendar. */
function GroomersSection() {
  const { groomers, business, addGroomer, updateGroomer, deleteGroomer } = useStore();
  const { configured } = useAuth();
  const allowed = canUseGroomers({
    subscriptionStatus: business.subscriptionStatus,
    plan: business.plan,
    trialEndsAt: business.trialEndsAt,
    configured,
  });
  const [name, setName] = useState("");
  const [colour, setColour] = useState(GROOMER_COLOURS[0]);

  if (!allowed) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-DEFAULT bg-surface-sunken p-4">
        <p className="text-sm text-ink-muted">
          Adding groomers and assigning bookings is a{" "}
          <span className="font-medium text-ink">Pro</span> feature — upgrade to build your team.
        </p>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-ink-inverse transition-colors hover:bg-accent-600"
        >
          See plans <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  function add() {
    const n = name.trim();
    if (!n) return;
    addGroomer({ name: n, colour });
    setName("");
    setColour(GROOMER_COLOURS[(GROOMER_COLOURS.indexOf(colour) + 1) % GROOMER_COLOURS.length]);
    toast.success(`${n} added`);
  }

  return (
    <div className="flex flex-col gap-3">
      {groomers.length > 0 && (
        <div className="flex flex-col gap-2">
          {groomers.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2.5 rounded-xl border border-DEFAULT bg-surface-sunken p-2.5 pl-3"
            >
              <CycleColourDot colour={g.colour} onChange={(c) => updateGroomer(g.id, { colour: c })} />
              <input
                value={g.name}
                onChange={(e) => updateGroomer(g.id, { name: e.target.value })}
                placeholder="Groomer's name"
                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
              />
              <button
                type="button"
                onClick={() => {
                  deleteGroomer(g.id);
                  toast.success(`${g.name || "Groomer"} removed`);
                }}
                aria-label="Remove groomer"
                className="shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add a groomer */}
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-strong p-2.5 pl-3">
        <CycleColourDot colour={colour} onChange={setColour} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a groomer…"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
        <Button size="sm" variant="secondary" onClick={add} disabled={!name.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
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

/** A labelled group of setting cards — the scannable top-level structure. */
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
        {title}
      </h2>
      {children}
    </div>
  );
}

/**
 * Business logo picker. Center-crops + shrinks the chosen image to a small
 * square, then (live) uploads it to the public business-logos Storage bucket and
 * hands back its URL, or (demo) hands back a data URL. Falls back to the
 * initial-letter avatar when no logo is set.
 */
function LogoUpload({
  name,
  logoUrl,
  onChange,
}: {
  name: string;
  logoUrl?: string;
  onChange: (url: string) => void;
}) {
  const { businessId, configured } = useAuth();
  const live = configured && !!businessId;
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That image is too large — 5MB max.");
      return;
    }
    setBusy(true);
    try {
      const { blob, dataUrl } = await resizeImageToSquare(file, 256);
      if (live && businessId) {
        const supabase = createSupabaseBrowserClient();
        const path = `${businessId}/logo-${Date.now()}.png`;
        const { error } = await supabase.storage
          .from("business-logos")
          .upload(path, blob, { upsert: true, contentType: "image/png" });
        if (error) throw error;
        const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
        onChange(data.publicUrl);
      } else {
        onChange(dataUrl); // demo: keep it local as a data URL
      }
      toast.success("Logo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't upload that logo — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">Logo</p>
      <div className="flex items-center gap-4">
        <BusinessLogo name={name} logoUrl={logoUrl} className="h-16 w-16 text-2xl" />
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={busy}
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {logoUrl ? "Change" : "Upload logo"}
            </Button>
            {logoUrl && (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onChange("")}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-subtle">Square looks best. PNG or JPG, up to 5MB.</p>
        </div>
      </div>
    </div>
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
