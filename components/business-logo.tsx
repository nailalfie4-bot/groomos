import { cn } from "@/lib/utils";

/**
 * The business's identity avatar: their uploaded logo when set, otherwise a
 * calm initial-letter fallback. Pure presentational (no hooks), so it works in
 * both server and client components. Size + shape come from `className`
 * (defaults to a rounded square; pass `rounded-full` for a circle).
 */
export function BusinessLogo({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string;
  className?: string;
}) {
  const letter = (name?.trim()?.charAt(0) || "G").toUpperCase();
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn("shrink-0 rounded-2xl object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl bg-accent-100 font-semibold text-accent-700",
        className,
      )}
      aria-hidden
    >
      {letter}
    </span>
  );
}
