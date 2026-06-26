import { cn } from "@/lib/utils";

/**
 * A warm little dog-face avatar — friendlier than initials. Each dog gets a
 * stable colour from the warm blush family (no green), derived from its id so
 * the same dog always looks the same.
 */
const COLORS = ["#C9756B", "#B25F56", "#CC8A6F", "#A87E74", "#BE8A5E", "#D28076"];

function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function PetAvatar({
  petId,
  name = "",
  className,
}: {
  petId: string;
  name?: string;
  className?: string;
}) {
  const c = colorFor(petId || name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-50",
        className ?? "h-9 w-9",
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="h-[82%] w-[82%]" fill="none">
        <g fill={c}>
          {/* floppy ears */}
          <ellipse cx="10.5" cy="16" rx="4.6" ry="7.6" transform="rotate(-14 10.5 16)" />
          <ellipse cx="29.5" cy="16" rx="4.6" ry="7.6" transform="rotate(14 29.5 16)" />
          {/* head */}
          <ellipse cx="20" cy="20.5" rx="11" ry="10.2" />
        </g>
        {/* muzzle */}
        <ellipse cx="20" cy="24.4" rx="5.7" ry="4.5" fill="#FCF6F4" />
        {/* eyes */}
        <circle cx="15.6" cy="18.6" r="1.5" fill="#2A2422" />
        <circle cx="24.4" cy="18.6" r="1.5" fill="#2A2422" />
        {/* nose + smile */}
        <ellipse cx="20" cy="22.6" rx="1.7" ry="1.3" fill="#2A2422" />
        <path
          d="M20 24v1.5M20 25.5q-1.8 0-2.7-1.3M20 25.5q1.8 0 2.7-1.3"
          stroke="#2A2422"
          strokeWidth="0.7"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
