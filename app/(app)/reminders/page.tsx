"use client";

/**
 * /reminders — "Send reminders": tomorrow's (or today's) bookings with a
 * one-tap WhatsApp reminder next to each, so the groomer can work down the list
 * the night before. Each button opens WhatsApp with the message pre-filled from
 * the business's template — the groomer taps send. Nothing is sent automatically.
 */
import { useMemo, useState } from "react";
import { CalendarClock, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { PetAvatar } from "@/components/pet-avatar";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import { addDays, formatTime, isSameDay } from "@/lib/format";
import { phoneStatus, renderTemplate } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Day = "today" | "tomorrow";

export default function RemindersPage() {
  const loading = useDemoLoad();
  const { appointments, business, settings, getClient, getPet, getService } = useStore();
  const [day, setDay] = useState<Day>("tomorrow");

  const target = useMemo(() => addDays(new Date(), day === "tomorrow" ? 1 : 0), [day]);

  const list = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            isSameDay(a.start, target) &&
            (a.status === "pending" || a.status === "confirmed"),
        )
        .sort((a, b) => (a.start < b.start ? -1 : 1)),
    [appointments, target],
  );

  const dayLabel = target.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader
        title="Send reminders"
        subtitle="Tap to open WhatsApp with the message ready — you send it. Nothing goes automatically."
      />

      {/* Today / Tomorrow toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-strong bg-surface p-0.5">
        {(["today", "tomorrow"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors duration-fast",
              day === d ? "bg-surface-sunken text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2 px-1 text-sm text-ink-muted">
        <CalendarClock className="h-4 w-4 text-accent" />
        <span>
          {dayLabel} · {loading ? "—" : `${list.length} booking${list.length === 1 ? "" : "s"}`}
        </span>
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
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            art={<DogEmpty />}
            title={`No bookings ${day}`}
            description={`Nothing to remind for ${dayLabel}. Enjoy the breather.`}
          />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((a) => {
              const pet = getPet(a.petId);
              const client = getClient(a.clientId);
              const service = getService(a.serviceId);
              const phone = phoneStatus(client?.phone);
              const message = renderTemplate(settings.whatsappTemplates.reminder, {
                business: business.name,
                client: client?.firstName ?? "there",
                dog: pet?.name ?? "your dog",
                date: a.start ? new Date(a.start).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "",
                time: formatTime(a.start),
                service: service?.name ?? "groom",
              });
              return (
                <li key={a.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <PetAvatar petId={a.petId} name={pet?.name ?? "Dog"} className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        <span className="tabular-nums text-ink-muted">{formatTime(a.start)}</span> · {pet?.name}
                        {client && (
                          <span className="font-normal text-ink-subtle">
                            {" "}· {client.firstName} {client.lastName}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {service?.name ?? "Groom"}
                        {!phone.ok && <span className="text-danger"> · {phone.reason}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="pl-[52px] sm:pl-0">
                    <WhatsAppButton phone={phone} message={message} label="WhatsApp reminder" size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 px-1 text-xs text-ink-subtle">
        <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Edit the wording any time in Settings → WhatsApp messages. Buttons are disabled with a reason
        when a client has no valid mobile number.
      </p>
    </>
  );
}
