import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Render just the mark, without the wordmark. */
  markOnly?: boolean;
}

/**
 * GroomOS mark — an original fine-line illustration of a shih tzu: the groomed
 * topknot bow, parted fringe, flat muzzle and long draping ears, drawn in a
 * single elegant thin-line style. Linework in warm ink, the topknot bow in the
 * rose accent. The same artwork backs the favicon (see app/icon.svg). Reads
 * cleanly on any light surface.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex h-8 w-8 shrink-0", className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <g
          fill="none"
          stroke="#2A2422"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* fluffy head with long draping ears + soft beard */}
          <path d="M32 14 C 27 11, 20 12, 17 17 C 13 21, 10 25, 11 31 C 12 37, 14 42, 16 46 C 18 50, 20 53, 24 52 C 27 51, 29 49, 32 49 C 35 49, 37 51, 40 52 C 44 53, 46 50, 48 46 C 50 42, 52 37, 53 31 C 54 25, 51 21, 47 17 C 44 12, 37 11, 32 14 Z" />
          {/* centre part */}
          <path d="M32 15 C 32 18, 32 20.5, 32 23" />
          {/* parted fringe over the brows */}
          <path d="M32 18 C 28 21, 24 23, 22 28" />
          <path d="M32 18 C 36 21, 40 23, 42 28" />
          {/* soft beard strands */}
          <path d="M30 44 C 30 47, 30 49, 31 51" />
          <path d="M34 44 C 34 47, 34 49, 33 51" />
          {/* mouth */}
          <path d="M32 39 C 32 41.5, 30 42.5, 28 41.5" />
          <path d="M32 39 C 32 41.5, 34 42.5, 36 41.5" />
          {/* topknot bow — rose accent */}
          <g stroke="#C9756B">
            <path d="M32 11 C 27 6, 22 8, 25 12 C 27 14, 31 13, 32 11" />
            <path d="M32 11 C 37 6, 42 8, 39 12 C 37 14, 33 13, 32 11" />
            <path d="M31 12 C 30 14.5, 29.5 16, 28.5 17" />
            <path d="M33 12 C 34 14.5, 34.5 16, 35.5 17" />
          </g>
        </g>
        {/* eyes + nose */}
        <circle cx="25" cy="30" r="3" fill="#2A2422" />
        <circle cx="39" cy="30" r="3" fill="#2A2422" />
        <circle cx="24" cy="29" r="0.9" fill="#FCF6F4" />
        <circle cx="38" cy="29" r="0.9" fill="#FCF6F4" />
        <ellipse cx="32" cy="36.5" rx="3" ry="2.5" fill="#2A2422" />
        {/* bow knot */}
        <ellipse cx="32" cy="11.2" rx="2.2" ry="1.9" fill="#C9756B" />
      </svg>
    </span>
  );
}

/**
 * Full GroomOS wordmark. "Groom" in warm ink, "OS" in the rose accent — the one
 * place the accent appears in type outside of primary actions, by design.
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
