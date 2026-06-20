import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/lib/types";

/** Maps an appointment status to the design-system Badge tone + label. */
const MAP: Record<
  AppointmentStatus,
  { tone: "neutral" | "accent" | "success" | "warning" | "danger"; label: string }
> = {
  pending: { tone: "warning", label: "Pending" },
  confirmed: { tone: "success", label: "Confirmed" },
  completed: { tone: "accent", label: "Completed" },
  "no-show": { tone: "danger", label: "No-show" },
  cancelled: { tone: "neutral", label: "Cancelled" },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { tone, label } = MAP[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
