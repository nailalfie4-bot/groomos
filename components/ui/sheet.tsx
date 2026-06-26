"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Bottom sheet — the mobile-first detail surface. Rises from the bottom edge on
 * phones (thumb-reachable), settles as a centred card on larger screens. Soft
 * scrim, short spring, a grabber handle. Body scrolls; footer stays put.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative flex max-h-[88vh] w-full flex-col overflow-hidden border border-DEFAULT bg-surface shadow-lg",
              "rounded-t-2xl sm:max-w-md sm:rounded-2xl",
              className,
            )}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {/* grabber (mobile) */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-border-strong" />
            </div>
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3">
                <div className="min-w-0">
                  {title && (
                    <h2 className="truncate text-lg font-semibold tracking-tight text-ink">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="truncate text-sm text-ink-muted">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-colors duration-fast hover:bg-surface-sunken hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && (
              <div className="flex items-center gap-2 border-t border-DEFAULT bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
