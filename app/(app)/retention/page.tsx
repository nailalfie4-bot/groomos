"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, CalendarPlus, HeartHandshake, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { BookingForm } from "@/components/booking-form";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { DueForGroom } from "@/lib/mock/store";
import { formatGBP, initials } from "@/lib/format";

export default function RetentionPage() {
  const loading = useDemoLoad();
  const { getDueForGroom, business, markReminderSent } = useStore();
  const due = getDueForGroom();
  const [reminder, setReminder] = useState<DueForGroom | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [booking, setBooking] = useState(false);

  const atRisk = useMemo(
    () => due.reduce((sum, d) => sum + d.lastPriceGBP, 0),
    [due],
  );

  function sendReminder(d: DueForGroom) {
    markReminderSent(d.pet.id);
    setSent((s) => new Set(s).add(d.pet.id));
    setReminder(null);
    toast.success(`Reminder sent to ${d.client.firstName}`, {
      description: `${d.pet.name}'s owner has been nudged.`,
    });
  }

  return (
    <>
      <PageHeader
        title="Due for a groom"
        subtitle="Past clients with no next visit booked — a gentle nudge brings them back"
        actions={
          <Button size="sm" onClick={() => setBooking(true)}>
            <CalendarPlus className="h-4 w-4" />
            Book one in
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <Stat label="Dogs due" value={loading ? "—" : String(due.length)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Stat
              label="Income at risk"
              value={loading ? "—" : formatGBP(atRisk)}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : due.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake />}
            title="You're all caught up"
            description="Every dog with a history has their next groom booked. Lovely work."
          />
        ) : (
          <div className="divide-y divide-border">
            {due.map((d) => (
              <div
                key={d.pet.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar initials={initials(d.pet.name)} tone="accent" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-ink">
                      {d.pet.name}{" "}
                      <span className="font-normal text-ink-subtle">
                        · {d.client.firstName} {d.client.lastName}
                      </span>
                    </span>
                    <span className="truncate text-xs text-ink-muted">
                      Last groomed {d.weeksSince} weeks ago · usually {formatGBP(d.lastPriceGBP)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-14 sm:pl-0">
                  {sent.has(d.pet.id) ? (
                    <Badge tone="success" dot>
                      Reminder sent
                    </Badge>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setReminder(d)}>
                      <BellRing className="h-4 w-4" />
                      Send a friendly reminder
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reminder preview */}
      <Modal
        open={reminder !== null}
        onClose={() => setReminder(null)}
        title="Send a friendly reminder"
        description="We'll text and email this for you — included in your plan, never charged per message."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setReminder(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => reminder && sendReminder(reminder)}>
              <MessageCircle className="h-4 w-4" />
              Send it
            </Button>
          </>
        }
      >
        {reminder && (
          <div className="pb-2">
            <div className="rounded-xl border border-DEFAULT bg-surface-sunken p-4 text-sm text-ink">
              Hi {reminder.client.firstName}, it&apos;s {business.name} 🐾 It&apos;s
              been about {reminder.weeksSince} weeks since {reminder.pet.name}&apos;s
              last groom — shall we get the next one booked in? Tap here to pick a
              time that suits you.
            </div>
            <p className="mt-2 text-xs text-ink-subtle">
              Sent to {reminder.client.phone} and {reminder.client.email}
            </p>
          </div>
        )}
      </Modal>

      <BookingForm open={booking} onClose={() => setBooking(false)} />
    </>
  );
}
