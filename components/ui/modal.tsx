"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Modal — a "meaningful moment", so it earns motion: a soft scrim fade and a
 * short spring on the panel. Fast and restrained, never gratuitous.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-xl border border-DEFAULT bg-surface shadow-lg",
              className,
            )}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-ink-subtle transition-colors duration-fast hover:bg-surface-sunken hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            {(title || description) && (
              <div className="flex flex-col gap-1 px-6 pt-6 pb-4">
                {title && (
                  <h2 className="text-lg font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-ink-muted">{description}</p>
                )}
              </div>
            )}
            {children && <div className="px-6 pb-2">{children}</div>}
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-DEFAULT px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
