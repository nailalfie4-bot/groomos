import { cn } from "@/lib/utils";

/** Initials avatar — quiet neutral tile, used for clients and pets. */
export function Avatar({
  initials,
  className,
  tone = "neutral",
}: {
  initials: string;
  className?: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        tone === "accent"
          ? "bg-accent-50 text-accent-700"
          : "bg-surface-sunken text-ink-muted",
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
