"use client";

/**
 * useClientsData — the Clients & Pets screens' data source.
 *
 * A thin adapter over the store (the single source of truth): real,
 * tenant-scoped Supabase data when configured + signed in, the mock seed in the
 * demo. Writes go through the store (optimistic + background persist).
 */
import { useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  useStore,
  type NewClientInput,
  type NewPetInput,
} from "@/lib/mock/store";
import type {
  Client,
  GroomingHistoryEntry,
  Pet,
  Settings,
} from "@/lib/types";

export interface UseClientsDataResult {
  clients: Client[];
  pets: Pet[];
  loading: boolean;
  getClient: (id: string) => Client | undefined;
  getPetsForClient: (clientId: string) => Pet[];
  getHistoryForPet: (petId: string) => GroomingHistoryEntry[];
  getLastGroomedAt: (petId: string) => string | undefined;
  settings: Settings;
  addClient: (input: NewClientInput) => Promise<Client>;
  addPet: (input: NewPetInput) => Promise<Pet>;
  updatePetNotes: (petId: string, notes: string) => Promise<void>;
  updatePetRebookWeeks: (petId: string, weeks: number | null) => void;
  isLive: boolean;
}

export function useClientsData(): UseClientsDataResult {
  const store = useStore();
  const { configured } = useAuth();

  const addClient = useCallback(
    async (input: NewClientInput) => store.addClient(input),
    [store],
  );
  const addPet = useCallback(
    async (input: NewPetInput) => store.addPet(input),
    [store],
  );
  const updatePetNotes = useCallback(
    async (petId: string, notes: string) => {
      store.updatePetNotes(petId, notes);
    },
    [store],
  );

  return {
    clients: store.clients,
    pets: store.pets,
    loading: !store.hydrated,
    getClient: store.getClient,
    getPetsForClient: store.getPetsForClient,
    getHistoryForPet: store.getHistoryForPet,
    getLastGroomedAt: store.getLastGroomedAt,
    settings: store.settings,
    addClient,
    addPet,
    updatePetNotes,
    updatePetRebookWeeks: store.updatePetRebookWeeks,
    isLive: configured,
  };
}
