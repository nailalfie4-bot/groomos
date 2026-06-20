"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const generatedId = useId();
    const taId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={taId} className="text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={taId}
          aria-invalid={error ? true : undefined}
          className={cn(
            "min-h-[88px] w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-ink shadow-xs transition-all duration-fast ease-out-soft placeholder:text-ink-subtle",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            error
              ? "border-danger focus:border-danger focus:ring-danger/25"
              : "border-strong focus:border-accent focus:ring-accent/25",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-ink-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
