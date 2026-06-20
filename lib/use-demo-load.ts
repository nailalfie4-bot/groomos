"use client";

import { useEffect, useState } from "react";

/**
 * Simulates a brief async load so screens can show real skeleton loaders,
 * even though the mock store is synchronous. When this is swapped for a real
 * data fetch, replace usages with the loading flag from React Query / SWR.
 */
export function useDemoLoad(ms = 450): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}
