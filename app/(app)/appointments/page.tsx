"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, Image as ImageIcon, PawPrint, Undo2, UserX, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import { BookingForm } from "@/components/booking-form";
import { CompleteFlow, ReportCard } from "@/components/grooming-report";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { formatDate, formatGBP, formatTime, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Closed" },
];

function matches(filter: Filter, status: AppointmentStatus): boolean {
  if (filter === "all") return true;
  if (filter === "cancelled") return status === "cancelled" || status === "no-show";
  return status === filter;
}

export default function AppointmentsPage() {
  const loading = useDemoLoad();
  const { appointments, services, getPet, getClient, setAppointmentStatus } =
    useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [completing, setCompleting] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const rows = useMemo(() => {
    const now = Date.now();
    return [...appointments]
      .filter((a) => matches(filter, a.status))
      .sort((a, b) => {
        const ta = new Date(a.start).getTime();
        const tb = new Date(b.start).getTime();
        const aUpcoming = ta >= now;
        const bUpcoming = tb >= now;
        // Upcoming first (ascending), then past (descending).
        if (aUpcoming && bUpcoming) return ta - tb;
        if (!aUpcoming && !bUpcoming) return tb - ta;
        return aUpcoming ? -1 : 1;
      });
  }, [appointments, filter]);

  function act(a: Appointment, status: AppointmentStatus, label: string) {
    setAppointmentStatus(a.id, status);
    toast.success(label);
  }

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Create, confirm and close out every visit"
        actions={
          <Button size="sm" onClick={() => setBooking(true)}>
            <CalendarPlus className="h-4 w-4" />
            New appointment
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-fast",
              filter === f.key
                ? "bg-ink text-ink-inverse"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-44" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<PawPrint />}
            title="No appointments here"
            description="Nothing matches this filter yet."
            action={
              <Button size="sm" onClick={() => setBooking(true)}>
                <CalendarPlus className="h-4 w-4" />
                New appointment
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {rows.map((a) => {
              const pet = getPet(a.petId);
              const client = getClient(a.clientId);
              const service = services.find((s) => s.id === a.serviceId);
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="tabular-nums w-16 shrink-0 text-xs text-ink-muted">
                      <div className="font-medium text-ink">
                        {formatTime(a.start)}
                      </div>
                      <div>{formatDate(a.start)}</div>
                    </div>
                    <Avatar initials={initials(pet?.name ?? "?")} tone="accent" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-ink">
                        {pet?.name}{" "}
                        <span className="font-normal text-ink-subtle">
                          · {client?.firstName} {client?.lastName}
                        </span>
                      </span>
                      <span className="truncate text-xs text-ink-muted">
                        {service?.name} · {formatGBP(a.priceGBP)}
                        {a.source === "online" && " · online"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-20 sm:pl-0">
                    {a.status === "completed" && a.report && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingReport(a.id)}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Card
                      </Button>
                    )}
                    <StatusBadge status={a.status} />
                    <AppointmentActions
                      status={a.status}
                      onConfirm={() => act(a, "confirmed", "Appointment confirmed")}
                      onComplete={() => setCompleting(a.id)}
                      onNoShow={() => act(a, "no-show", "Marked as no-show")}
                      onCancel={() => act(a, "cancelled", "Appointment cancelled")}
                      onReopen={() => act(a, "confirmed", "Reopened")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <BookingForm open={booking} onClose={() => setBooking(false)} />
      <CompleteFlow appointmentId={completing} onClose={() => setCompleting(null)} />
      <ReportCard appointmentId={viewingReport} onClose={() => setViewingReport(null)} />
    </>
  );
}

function AppointmentActions({
  status,
  onConfirm,
  onComplete,
  onNoShow,
  onCancel,
  onReopen,
}: {
  status: AppointmentStatus;
  onConfirm: () => void;
  onComplete: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onReopen: () => void;
}) {
  if (status === "pending") {
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="secondary" onClick={onConfirm}>
          <Check className="h-4 w-4" />
          Confirm
        </Button>
        <IconAction label="Cancel" onClick={onCancel} danger>
          <X className="h-4 w-4" />
        </IconAction>
      </div>
    );
  }
  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-1">
        <Button size="sm" variant="secondary" onClick={onComplete}>
          <Check className="h-4 w-4" />
          Complete
        </Button>
        <IconAction label="No-show" onClick={onNoShow}>
          <UserX className="h-4 w-4" />
        </IconAction>
        <IconAction label="Cancel" onClick={onCancel} danger>
          <X className="h-4 w-4" />
        </IconAction>
      </div>
    );
  }
  // Terminal states — allow reopening.
  return (
    <IconAction label="Reopen" onClick={onReopen}>
      <Undo2 className="h-4 w-4" />
    </IconAction>
  );
}

function IconAction({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors duration-fast",
        danger
          ? "hover:bg-danger-soft hover:text-danger"
          : "hover:bg-surface-sunken hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
