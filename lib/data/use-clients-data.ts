"use client";

/**
 * useClientsData — the Clients & Pets screens' data source, with a demo
 * fallback. When configured + signed in, it reads live tenant-scoped clients,
 * pets, services, appointments and settings from Supabase (services +
 * appointments power each pet's grooming history); otherwise it delegates to
 * the in-memory mock store so the public demo keeps working.
 *
 * Writes are async in both modes; the live path writes then refetches. All
 * hooks are called unconditionally — the demo-vs-live choice is in the return.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  useStore,
  type NewClientInput,
  type NewPetInput,
} from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type {
  Appointment,
  Client,
  GroomingHistoryEntry,
  Pet,
  Service,
  Settings,
} from "@/lib/types";
import { fetchClients, insertClient } from "@/lib/data/clients";
import { fetchPets, insertPet, updatePetNotes as updatePetNotesRow } from "@/lib/data/pets";
import { fetchServices } from "@/lib/data/services";
import { fetchAppointments } from "@/lib/data/appointments";
import { fetchSettings } from "@/lib/data/settings";

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
  isLive: boolean;
}

export function useClientsData(): UseClientsDataResult {
  const store = useStore();
  const { configured, user, businessId } = useAuth();
  const demoLoading = useDemoLoad();

  const isLive = configured;
  const ready = isLive && !!user && !!businessId;

  const [rClients, setRClients] = useState<Client[]>([]);
  const [rPets, setRPets] = useState<Pet[]>([]);
  const [rServices, setRServices] = useState<Service[]>([]);
  const [rAppointments, setRAppointments] = useState<Appointment[]>([]);
  const [rSettings, setRSettings] = useState<Settings>(store.settings);
  const [fetching, setFetching] = useState(true);

  const refetchClients = useCallback(async () => {
    if (businessId) setRClients(await fetchClients(businessId));
  }, [businessId]);
  const refetchPets = useCallback(async () => {
    if (businessId) setRPets(await fetchPets(businessId));
  }, [businessId]);

  useEffect(() => {
    if (!ready || !businessId) return;
    let active = true;
    setFetching(true);
    Promise.all([
      fetchClients(businessId),
      fetchPets(businessId),
      fetchServices(businessId),
      fetchAppointments(businessId),
      fetchSettings(businessId),
    ])
      .then(([c, p, s, a, set]) => {
        if (!active) return;
        setRClients(c);
        setRPets(p);
        setRServices(s);
        setRAppointments(a);
        setRSettings(set);
      })
      .catch((e) => console.error("Failed to load clients data", e))
      .finally(() => {
        if (active) setFetching(false);
      });
    return () => {
      active = false;
    };
  }, [ready, businessId]);

  // Active data source: live arrays when configured, else the mock store.
  const clients = isLive ? rClients : store.clients;
  const pets = isLive ? rPets : store.pets;
  const services = isLive ? rServices : store.services;
  const appointments = isLive ? rAppointments : store.appointments;
  const settings = isLive ? rSettings : store.settings;

  const getClient = useCallback(
    (id: string) => clients.find((c) => c.id === id),
    [clients],
  );
  const getPetsForClient = useCallback(
    (clientId: string) => pets.filter((p) => p.clientId === clientId),
    [pets],
  );
  const getHistoryForPet = useCallback(
    (petId: string): GroomingHistoryEntry[] =>
      appointments
        .filter((a) => a.petId === petId)
        .map((appointment) => {
          const service = services.find((s) => s.id === appointment.serviceId);
          return service ? { appointment, service } : null;
        })
        .filter((e): e is GroomingHistoryEntry => e !== null)
        .sort((a, b) => (a.appointment.start < b.appointment.start ? 1 : -1)),
    [appointments, services],
  );
  const getLastGroomedAt = useCallback(
    (petId: string): string | undefined =>
      appointments
        .filter((a) => a.petId === petId && a.status === "completed")
        .map((a) => a.start)
        .sort()
        .at(-1),
    [appointments],
  );

  const addClient = useCallback(
    async (input: NewClientInput): Promise<Client> => {
      if (isLive && businessId) {
        const c = await insertClient(businessId, input);
        await refetchClients();
        return c;
      }
      return store.addClient(input);
    },
    [isLive, businessId, refetchClients, store],
  );
  const addPet = useCallback(
    async (input: NewPetInput): Promise<Pet> => {
      if (isLive && businessId) {
        const p = await insertPet(businessId, input);
        await refetchPets();
        return p;
      }
      return store.addPet(input);
    },
    [isLive, businessId, refetchPets, store],
  );
  const updatePetNotes = useCallback(
    async (petId: string, notes: string): Promise<void> => {
      if (isLive && businessId) {
        await updatePetNotesRow(petId, notes);
        await refetchPets();
      } else {
        store.updatePetNotes(petId, notes);
      }
    },
    [isLive, businessId, refetchPets, store],
  );

  return {
    clients,
    pets,
    loading: isLive ? !ready || fetching : demoLoading,
    getClient,
    getPetsForClient,
    getHistoryForPet,
    getLastGroomedAt,
    settings,
    addClient,
    addPet,
    updatePetNotes,
    isLive,
  };
}
