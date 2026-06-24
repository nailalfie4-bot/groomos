import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Lucide icon element, rendered in a quiet neutral tile. */
  icon?: React.ReactNode;
  /** Optional warm flat-dog illustration shown above the heading (takes
   *  precedence over `icon`). */
  art?: React.ReactNode;
  title: string;
  description?: string;
  /** A single, clear call to action. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Every empty view gets one of these: a warm illustration (or quiet icon), a
 * confident heading, one line of help, and exactly one CTA.
 */
export function EmptyState({
  icon,
  art,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {art ? (
        <div className="mb-4 w-24">{art}</div>
      ) : (
        icon && (
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-DEFAULT bg-surface text-ink-subtle shadow-xs [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </div>
        )
      )}
      <h3 className="text-base font-semibold tracking-tight text-ink">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
