"use client";

/**
 * useServices — the Services screen's data source, with a demo fallback.
 *
 * When real Supabase keys are present (`configured`), this reads and writes the
 * live, tenant-scoped `services` table for the logged-in user's business. When
 * they're absent, it transparently falls back to the in-memory mock store so
 * the public demo keeps working with no accounts or network.
 *
 * All hooks are called unconditionally (Rules of Hooks); the demo-vs-live
 * choice happens in the returned value. Both modes expose the same async write
 * API so the screen code is identical either way.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStore, type NewServiceInput } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { Service } from "@/lib/types";
import {
  deleteService as deleteServiceRow,
  fetchBookedCounts,
  fetchServices,
  insertService,
  updateService as updateServiceRow,
} from "@/lib/data/services";

export interface UseServicesResult {
  services: Service[];
  /** True while the first load is in flight (skeletons). */
  loading: boolean;
  /** Live (non-cancelled) appointment count for a service id. */
  bookedCountFor: (serviceId: string) => number;
  addService: (input: NewServiceInput) => Promise<void>;
  updateService: (id: string, patch: Partial<NewServiceInput>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  /** True when backed by real Supabase data (vs the demo mock store). */
  isLive: boolean;
}

export function useServices(): UseServicesResult {
  const store = useStore();
  const { configured, user, businessId } = useAuth();
  const demoLoading = useDemoLoad();

  // Real Supabase-backed data whenever the app is configured with real keys.
  // (The app shell guarantees a signed-in user before this screen renders in
  // configured mode; `businessId` may still be resolving for a beat.)
  const isLive = configured;
  const ready = isLive && !!user && !!businessId;

  // ── Live-mode state ─────────────────────────────────────────────────────────
  const [rows, setRows] = useState<Service[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [fetching, setFetching] = useState(true);

  const refetch = useCallback(async () => {
    if (!businessId) return;
    const [svcs, cnts] = await Promise.all([
      fetchServices(businessId),
      fetchBookedCounts(businessId),
    ]);
    setRows(svcs);
    setCounts(cnts);
  }, [businessId]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setFetching(true);
    refetch()
      .catch((e) => {
        console.error("Failed to load services", e);
        if (active) {
          setRows([]);
          setCounts({});
        }
      })
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [ready, refetch]);

  // ── Demo-mode counts, derived from the mock store's appointments ────────────
  const demoCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of store.appointments) {
      if (a.status === "cancelled") continue;
      m[a.serviceId] = (m[a.serviceId] ?? 0) + 1;
    }
    return m;
  }, [store.appointments]);

  // ── Writes (async in both modes; live path writes then refetches) ───────────
  const addService = useCallback(
    async (input: NewServiceInput) => {
      if (isLive) {
        if (!businessId) return;
        await insertService(businessId, input);
        await refetch();
      } else {
        store.addService(input);
      }
    },
    [isLive, businessId, refetch, store],
  );

  const updateService = useCallback(
    async (id: string, patch: Partial<NewServiceInput>) => {
      if (isLive) {
        await updateServiceRow(id, patch);
        await refetch();
      } else {
        store.updateService(id, patch);
      }
    },
    [isLive, refetch, store],
  );

  const deleteService = useCallback(
    async (id: string) => {
      if (isLive) {
        await deleteServiceRow(id);
        await refetch();
      } else {
        store.deleteService(id);
      }
    },
    [isLive, refetch, store],
  );

  const bookedCountFor = useCallback(
    (serviceId: string) => (isLive ? counts : demoCounts)[serviceId] ?? 0,
    [isLive, counts, demoCounts],
  );

  return {
    services: isLive ? rows : store.services,
    loading: isLive ? !ready || fetching : demoLoading,
    bookedCountFor,
    addService,
    updateService,
    deleteService,
    isLive,
  };
}
