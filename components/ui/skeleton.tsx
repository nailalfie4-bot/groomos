import { cn } from "@/lib/utils";

/**
 * Skeleton loader — the system's content-loading primitive. Use these, never
 * spinners, for content that is arriving.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-shimmer relative overflow-hidden rounded-md bg-surface-sunken",
        className,
      )}
      {...props}
    />
  );
}
