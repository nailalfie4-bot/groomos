"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BellRing,
  CalendarPlus,
  HeartHandshake,
  Mail,
  PiggyBank,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { PetAvatar } from "@/components/pet-avatar";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { BookingForm } from "@/components/booking-form";
import { useStore } from "@/lib/mock/store";
import { useAuth } from "@/components/auth-provider";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { DueForGroom } from "@/lib/mock/store";
import { addDays, atHour, formatGBP } from "@/lib/format";

export default function RetentionPage() {
  const loading = useDemoLoad();
  const { configured } = useAuth();
  const { getDueForGroom, business, markReminderSent } = useStore();
  const due = getDueForGroom();
  const [reminder, setReminder] = useState<DueForGroom | null>(null);
  const [rebook, setRebook] = useState<DueForGroom | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const atRisk = useMemo(() => due.reduce((sum, d) => sum + d.lastPriceGBP, 0), [due]);

  async function sendReminder(d: DueForGroom) {
    // Demo (no Supabase) simulates; the real app actually emails the client.
    if (!configured) {
      markReminderSent(d.pet.id);
      setSent((s) => new Set(s).add(d.pet.id));
      setReminder(null);
      toast.success(`Reminder emailed to ${d.client.email}`, {
        description: `We nudged ${d.pet.name}'s owner to rebook.`,
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ petId: d.pet.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.skipped) {
        setReminder(null);
        toast("Email isn't switched on yet", {
          description: "Add your Resend key in Vercel to start sending reminders.",
        });
        return;
      }
      if (!res.ok || !data?.ok) {
        toast.error("Couldn't send the reminder — please try again.");
        return;
      }
      setSent((s) => new Set(s).add(d.pet.id));
      setReminder(null);
      toast.success(`Reminder emailed to ${d.client.email}`, {
        description: `We nudged ${d.pet.name}'s owner to rebook.`,
      });
    } catch {
      toast.error("Couldn't reach the server — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Due for a groom"
        subtitle="Dogs coming due with no next visit booked — nudged early so you can get them a slot in time."
      />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard icon={<HeartHandshake className="h-4 w-4" />} label="Dogs due" value={loading ? "—" : String(due.length)} />
        <StatCard accent icon={<PiggyBank className="h-4 w-4" />} label="Income at risk" value={loading ? "—" : formatGBP(atRisk)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : due.length === 0 ? (
          <EmptyState
            art={<DogEmpty />}
            title="You're all caught up"
            description="Every dog with a history has their next groom booked. Lovely work."
          />
        ) : (
          <ul className="divide-y divide-border">
            {due.map((d) => {
              const over = d.weeksSince - d.rebookWeeks; // >0 overdue, <0 due soon
              return (
                <li key={d.pet.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PetAvatar petId={d.pet.id} name={d.pet.name} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {d.pet.name}{" "}
                        <span className="font-normal text-ink-subtle">
                          · {d.client.firstName} {d.client.lastName}
                        </span>
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        Last groomed {d.weeksSince}w ago · usually {formatGBP(d.lastPriceGBP)}
                      </p>
                    </div>
                    {over > 0 ? (
                      <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-deep">
                        {over}w overdue
                      </span>
                    ) : over === 0 ? (
                      <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-deep">
                        due now
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
                        due in {-over}w
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
                    {sent.has(d.pet.id) ? (
                      <Badge tone="success" dot>Reminder sent</Badge>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setReminder(d)}>
                        <BellRing className="h-4 w-4" />
                        Nudge
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setRebook(d)}>
                      <CalendarPlus className="h-4 w-4" />
                      Rebook
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Reminder preview */}
      <Modal
        open={reminder !== null}
        onClose={() => setReminder(null)}
        title="Send a friendly reminder"
        description="We'll email this to your client — it's included in your plan."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReminder(null)}>Cancel</Button>
            <Button size="sm" loading={sending} disabled={sending} onClick={() => reminder && sendReminder(reminder)}>
              <Mail className="h-4 w-4" />
              Send email
            </Button>
          </>
        }
      >
        {reminder && (
          <div className="pb-2">
            <div className="rounded-xl border border-DEFAULT bg-surface-sunken p-4 text-sm leading-relaxed text-ink">
              Hi {reminder.client.firstName}, it&apos;s {business.name} 🐾 It&apos;s been about{" "}
              {reminder.weeksSince} weeks since {reminder.pet.name}&apos;s last groom — shall we get
              the next one booked in? Tap here to pick a time that suits you.
            </div>
            <p className="mt-2 text-xs text-ink-subtle">
              We&apos;ll email this to {reminder.client.email}
            </p>
          </div>
        )}
      </Modal>

      <BookingForm
        open={rebook !== null}
        onClose={() => setRebook(null)}
        defaultClientId={rebook?.client.id}
        defaultPetId={rebook?.pet.id}
        defaultStart={atHour(addDays(new Date(), 7), business.openHour)}
      />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-DEFAULT bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <span
          className={
            accent
              ? "flex h-7 w-7 items-center justify-center rounded-lg bg-accent-100 text-accent-700"
              : "flex h-7 w-7 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted"
          }
        >
          {icon}
        </span>
        <span className="text-xs font-medium text-ink-muted">{label}</span>
      </div>
      <p className="tabular-nums mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}
