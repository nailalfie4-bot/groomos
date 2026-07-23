"use client";

/**
 * useIsFounder — client-side founder check for showing founder-only UI.
 *
 * Asks the server (/api/founder/status, which runs the same getFounder() gate)
 * whether the signed-in account is the founder. This is for VISIBILITY only; the
 * privileged actions are independently gated server-side in their API routes, so
 * a forced render can't do anything. Defaults to false, so nothing founder-only
 * ever flashes for a normal account.
 */
import { useEffect, useState } from "react";

export function useIsFounder(): boolean {
  const [isFounder, setIsFounder] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/founder/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (active) setIsFounder(Boolean(d?.isFounder));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return isFounder;
}
