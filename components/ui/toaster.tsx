"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast surface. Toasts (not alerts) confirm actions. Styled to match
 * the system: white surface, hairline border, soft shadow, accent for success.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={10}
      offset={20}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group flex w-full items-center gap-3 rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 shadow-md",
          title: "text-sm font-medium text-[#1A1A1A]",
          description: "text-xs text-[#6B6B66]",
          icon: "shrink-0",
          actionButton:
            "ml-auto rounded-md bg-[#1F7A4D] px-2.5 py-1 text-xs font-medium text-[#FAFAF8]",
          cancelButton:
            "rounded-md px-2.5 py-1 text-xs font-medium text-[#6B6B66]",
          success: "[&_[data-icon]]:text-[#1F7A4D]",
          error: "[&_[data-icon]]:text-[#B23B30]",
        },
      }}
    />
  );
}
