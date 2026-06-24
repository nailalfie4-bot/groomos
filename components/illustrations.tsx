import { cn } from "@/lib/utils";

/**
 * Warm, on-brand flat dog illustrations — inline SVG in the blush palette
 * (#C9756B rose, #E8A8A0 soft rose, #FCF6F4 cream, #7A3B36 deep rose).
 * Decorative only, so all are aria-hidden.
 */

/** A friendly flat sitting dog. `scruff` adds stray tufts; `bow` adds a tidy bow. */
export function DogSitting({
  className,
  scruff = false,
  bow = false,
}: {
  className?: string;
  scruff?: boolean;
  bow?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-auto w-full", className)}
      aria-hidden="true"
    >
      {/* tail */}
      <path d="M148 156q30-8 28-46q-20 8-24 32z" fill="#E8A8A0" />
      {/* body */}
      <path d="M60 190q-12-80 40-88q52 8 40 88z" fill="#C9756B" />
      {/* chest fluff */}
      <path d="M100 116q15 6 15 42l-30 0q0-36 15-42z" fill="#E8A8A0" opacity="0.65" />
      {/* front legs + paws */}
      <rect x="79" y="150" width="17" height="42" rx="8.5" fill="#C9756B" />
      <rect x="104" y="150" width="17" height="42" rx="8.5" fill="#C9756B" />
      <ellipse cx="87.5" cy="189" rx="11" ry="7" fill="#FCF6F4" />
      <ellipse cx="112.5" cy="189" rx="11" ry="7" fill="#FCF6F4" />
      {scruff && (
        <path
          d="M70 120l-7-5M132 122l8-4M66 150l-8-2M138 150l8-2"
          stroke="#E8A8A0"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {/* ears (behind head) */}
      <path d="M60 46q-18 6-15 44q20-2 28-24z" fill="#E8A8A0" />
      <path d="M140 46q18 6 15 44q-20-2-28-24z" fill="#E8A8A0" />
      {/* head */}
      <ellipse cx="100" cy="70" rx="43" ry="41" fill="#C9756B" />
      {/* muzzle */}
      <ellipse cx="100" cy="85" rx="23" ry="18" fill="#FCF6F4" />
      {/* cheeks */}
      <circle cx="73" cy="80" r="5.5" fill="#E8A8A0" opacity="0.6" />
      <circle cx="127" cy="80" r="5.5" fill="#E8A8A0" opacity="0.6" />
      {/* eyes */}
      <circle cx="85" cy="64" r="4.6" fill="#2A2422" />
      <circle cx="115" cy="64" r="4.6" fill="#2A2422" />
      <circle cx="86.6" cy="62.4" r="1.4" fill="#FCF6F4" />
      <circle cx="116.6" cy="62.4" r="1.4" fill="#FCF6F4" />
      {/* nose + smile */}
      <ellipse cx="100" cy="78" rx="5.6" ry="4.6" fill="#7A3B36" />
      <path
        d="M100 82v6M100 88q-7 0-10-5M100 88q7 0 10-5"
        stroke="#7A3B36"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      {bow && (
        <g>
          <path d="M138 40l14-7v18z" fill="#7A3B36" />
          <path d="M138 40l14 7v-18z" fill="#7A3B36" />
          <circle cx="138" cy="40" r="4.5" fill="#C9756B" />
        </g>
      )}
    </svg>
  );
}

/** Small friendly dog face for empty states. */
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
      <path d="M34 36q-15 4-13 34q17-2 24-20z" fill="#E8A8A0" />
      <path d="M86 36q15 4 13 34q-17-2-24-20z" fill="#E8A8A0" />
      <ellipse cx="60" cy="58" rx="32" ry="30" fill="#C9756B" />
      <ellipse cx="60" cy="70" rx="17" ry="13" fill="#FCF6F4" />
      <circle cx="49" cy="53" r="3.6" fill="#2A2422" />
      <circle cx="71" cy="53" r="3.6" fill="#2A2422" />
      <ellipse cx="60" cy="65" rx="4.4" ry="3.6" fill="#7A3B36" />
      <path d="M60 68v5M60 73q-5 0-7-4M60 73q5 0 7-4" stroke="#7A3B36" strokeWidth="2" fill="none" strokeLinecap="round" />
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
