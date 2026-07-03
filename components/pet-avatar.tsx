import { cn } from "@/lib/utils";

/**
 * A clean monogram avatar — the pet's initial in a soft blush circle. A calm,
 * neutral placeholder until real pet photos are added. Each pet keeps a stable
 * colour from the warm blush family, derived from its id.
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
  const initial = (name.trim()[0] ?? "").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-50",
        className ?? "h-9 w-9",
      )}
      aria-hidden="true"
    >
      {/* SVG text so the initial scales with the circle size. */}
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <text
          x="20"
          y="20"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          fontWeight="600"
          fontFamily="inherit"
          fill={c}
        >
          {initial}
        </text>
      </svg>
    </span>
  );
}
