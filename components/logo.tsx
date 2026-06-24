import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Render just the mark, without the wordmark. */
  markOnly?: boolean;
}

/**
 * GroomOS mark — a tasteful minimal dog face on a rose tile. Self-contained
 * (explicit blush-palette fills) so the exact artwork doubles as the favicon
 * (see app/icon.svg). Reads cleanly from 20px up.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex h-8 w-8 shrink-0", className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <rect width="32" height="32" rx="9" fill="#C9756B" />
        {/* ears */}
        <ellipse cx="9.6" cy="13" rx="3.4" ry="5.3" transform="rotate(-22 9.6 13)" fill="#FCF6F4" />
        <ellipse cx="22.4" cy="13" rx="3.4" ry="5.3" transform="rotate(22 22.4 13)" fill="#FCF6F4" />
        <ellipse cx="10.1" cy="13.4" rx="1.7" ry="3" transform="rotate(-22 10.1 13.4)" fill="#E8A8A0" />
        <ellipse cx="21.9" cy="13.4" rx="1.7" ry="3" transform="rotate(22 21.9 13.4)" fill="#E8A8A0" />
        {/* head */}
        <ellipse cx="16" cy="16.6" rx="7.5" ry="6.9" fill="#FCF6F4" />
        {/* eyes */}
        <circle cx="12.9" cy="15.6" r="1.15" fill="#7A3B36" />
        <circle cx="19.1" cy="15.6" r="1.15" fill="#7A3B36" />
        {/* nose + muzzle */}
        <ellipse cx="16" cy="19" rx="1.7" ry="1.45" fill="#7A3B36" />
        <path
          d="M16 20.4c0 1.1-.9 1.7-2 1.7M16 20.4c0 1.1.9 1.7 2 1.7"
          stroke="#7A3B36"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/**
 * Full GroomOS wordmark. "Groom" in ink, "OS" in the rose accent — the one
 * place the accent appears outside of primary actions, by design.
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
