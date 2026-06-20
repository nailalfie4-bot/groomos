import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline error state — used when something a screen depends on is missing. */
export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-DEFAULT bg-danger-soft text-danger shadow-xs">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
