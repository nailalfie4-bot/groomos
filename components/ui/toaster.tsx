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
            "group flex w-full items-center gap-3 rounded-xl border border-[#F1DEDA] bg-white px-4 py-3 shadow-md",
          title: "text-sm font-medium text-[#2A2422]",
          description: "text-xs text-[#8A7470]",
          icon: "shrink-0",
          actionButton:
            "ml-auto rounded-md bg-[#C9756B] px-2.5 py-1 text-xs font-medium text-[#FCF6F4]",
          cancelButton:
            "rounded-md px-2.5 py-1 text-xs font-medium text-[#8A7470]",
          success: "[&_[data-icon]]:text-[#5E8C6A]",
          error: "[&_[data-icon]]:text-[#BD5248]",
        },
      }}
    />
  );
}
