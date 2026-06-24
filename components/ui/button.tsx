"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-fast ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Solid accent — reserved for the single primary action on a view.
  primary:
    "bg-accent text-ink-inverse shadow-xs hover:bg-accent-600 active:bg-accent-700",
  // Subtle bordered — the workhorse secondary.
  secondary:
    "bg-surface text-ink border border-strong shadow-xs hover:bg-surface-sunken active:bg-surface-sunken",
  // Ghost — tertiary, low commitment.
  ghost: "bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink",
  // Destructive — quiet until hovered.
  danger:
    "bg-surface text-danger border border-strong shadow-xs hover:bg-danger hover:text-ink-inverse hover:border-transparent",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  // Prominent — for landing-page hero / CTA actions.
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
