import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatProps {
  label: string;
  value: string;
  /** Signed delta, e.g. "+12.5%". Direction is inferred from the sign. */
  delta?: string;
  className?: string;
}

/** A single metric. Numbers render with tabular, lining figures. */
export function Stat({ label, value, delta, className }: StatProps) {
  const isNegative = delta?.trim().startsWith("-");
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm text-ink-muted">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="tabular-nums text-2xl font-semibold tracking-tight text-ink">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              isNegative ? "text-danger" : "text-success",
            )}
          >
            {isNegative ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" />
            )}
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
