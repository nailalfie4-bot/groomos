"use client";

/**
 * useServices — the Services screen's data source.
 *
 * A thin adapter over the store, which is the single source of truth: real,
 * tenant-scoped Supabase data when configured + signed in, the mock seed in the
 * demo. Writes go through the store (optimistic + background persist), so a
 * service added here is instantly visible everywhere else (e.g. the booking
 * form's service list).
 */
import { useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useStore, type NewServiceInput } from "@/lib/mock/store";
import type { Service } from "@/lib/types";

export interface UseServicesResult {
  services: Service[];
  loading: boolean;
  bookedCountFor: (serviceId: string) => number;
  addService: (input: NewServiceInput) => Promise<void>;
  updateService: (id: string, patch: Partial<NewServiceInput>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  isLive: boolean;
}

export function useServices(): UseServicesResult {
  const store = useStore();
  const { configured } = useAuth();

  const bookedCountFor = useCallback(
    (serviceId: string) =>
      store.appointments.filter(
        (a) => a.serviceId === serviceId && a.status !== "cancelled",
      ).length,
    [store.appointments],
  );

  const addService = useCallback(
    async (input: NewServiceInput) => {
      store.addService(input);
    },
    [store],
  );
  const updateService = useCallback(
    async (id: string, patch: Partial<NewServiceInput>) => {
      store.updateService(id, patch);
    },
    [store],
  );
  const deleteService = useCallback(
    async (id: string) => {
      store.deleteService(id);
    },
    [store],
  );

  return {
    services: store.services,
    loading: !store.hydrated,
    bookedCountFor,
    addService,
    updateService,
    deleteService,
    isLive: configured,
  };
}
