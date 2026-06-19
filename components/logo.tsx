import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Render just the mark, without the wordmark. */
  markOnly?: boolean;
}

/**
 * GroomOS mark — a rounded tile holding a minimal "comb" glyph: three
 * confident teeth over a baseline. Geometric, single-weight, reads at 20px.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-ink-inverse",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3.25 3.5V11.5M6.5 3.5V11.5M9.75 3.5V11.5M13 3.5V11.5M2 14.25H14.75"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * Full GroomOS wordmark. "Groom" in ink, "OS" in the accent — the one place
 * the accent appears outside of primary actions, by design.
 */
export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!markOnly && (
        <span className="text-lg font-semibold tracking-tight text-ink">
          Groom<span className="text-accent">OS</span>
        </span>
      )}
    </span>
  );
}
