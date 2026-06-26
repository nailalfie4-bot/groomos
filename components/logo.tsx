import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Render just the rose app-icon mark, without the full wordmark lockup. */
  markOnly?: boolean;
}

/**
 * GroomOS logo — the finished brand artwork: a fine-line shih tzu with a bow
 * above the "GroomOS" wordmark. Served as a transparent PNG from
 * /public/assets so it sits cleanly on any surface. The rose app-icon version
 * (groomos-icon.png) backs the favicons.
 */
export function Logo({ className, markOnly = false }: LogoProps) {
  if (markOnly) return <LogoMark className={className} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/groomos-logo.png"
      alt="GroomOS"
      width={584}
      height={513}
      className={cn("h-12 w-auto select-none", className)}
    />
  );
}

/** Icon-only mark — the rose app-icon tile, for compact placements. */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/groomos-icon.png"
      alt="GroomOS"
      width={512}
      height={512}
      className={cn("h-8 w-8 select-none rounded-[24%]", className)}
    />
  );
}
