import { cn } from "@/lib/utils";

/**
 * Small, clean decorative marks in the blush palette — simple paw motifs, not
 * literal dog illustrations. Placeholders until real photography is added.
 * Decorative only, so all are aria-hidden.
 */

/** A soft blush disc with a simple paw print — a calm empty-state placeholder. */
export function DogEmpty({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="56" fill="#FBEEEB" />
      <g fill="#C9756B">
        <ellipse cx="60" cy="74" rx="15" ry="12" />
        <circle cx="41" cy="58" r="5.8" />
        <circle cx="53" cy="47" r="6.2" />
        <circle cx="67" cy="47" r="6.2" />
        <circle cx="79" cy="58" r="5.8" />
      </g>
    </svg>
  );
}

/** A single flat paw print. */
function Paw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="#C9756B" className={className} aria-hidden="true">
      <ellipse cx="20" cy="26" rx="11" ry="9" />
      <circle cx="9" cy="14" r="4.2" />
      <circle cx="20" cy="9" r="4.6" />
      <circle cx="31" cy="14" r="4.2" />
    </svg>
  );
}

/** A soft decorative paw trail for section accents. */
export function PawTrail({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden="true">
      <Paw className="h-4 w-4 rotate-[-18deg] opacity-30" />
      <Paw className="h-5 w-5 rotate-[8deg] opacity-50" />
      <Paw className="h-4 w-4 rotate-[-12deg] opacity-30" />
    </div>
  );
}
