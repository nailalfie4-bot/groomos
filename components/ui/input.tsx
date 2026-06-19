"use client";

import { forwardRef, useId } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  /** Inline validation message; switches the field into the error state. */
  error?: string;
  /** Optional leading icon (Lucide), rendered at 16px. */
  leadingIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, leadingIcon, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-ink"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle [&>svg]:h-4 [&>svg]:w-4">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "h-10 w-full rounded-lg border bg-surface px-3 text-sm text-ink shadow-xs transition-all duration-fast ease-out-soft placeholder:text-ink-subtle",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              leadingIcon && "pl-9",
              error
                ? "border-danger focus:border-danger focus:ring-danger/25"
                : "border-strong focus:border-accent focus:ring-accent/25",
              className,
            )}
            {...props}
          />
        </div>

        {error ? (
          <p
            id={`${inputId}-error`}
            className="flex items-center gap-1.5 text-xs text-danger"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
