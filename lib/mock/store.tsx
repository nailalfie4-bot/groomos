"use client";

/**
 * In-memory mock data layer for GroomOS.
 *
 * This is the single source of truth for the running demo. It holds all
 * entities in React state and exposes typed CRUD methods. Everything is
 * synchronous and local — no network, no accounts, no keys.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SWAPPING IN A REAL BACKEND LATER
 * ──────────────────────────────────────────────────────────────────────────
 * The UI only ever talks to the methods on this context, never to the data
 * directly. To go live:
 *   1. Replace `createSeed()` initial state with data fetched from your API.
 *   2. Make each method below call your backend (e.g. Supabase insert/update)
 *      and update local state from the response.
 *   3. Optionally wrap reads in React Query / SWR for caching.
 * The method signatures and the types in `lib/types.ts` stay the same, so no
 * screen or component needs to change.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Appointment,
  AppointmentStatus,
  Business,
  Client,
  DogSize,
  GroomingHistoryEntry,
  Pet,
  Service,
} from "@/lib/types";
import { createSeed } from "@/lib/mock/seed";

const STORAGE_KEY = "groomos.demo.v1";

/** Input shapes for create operations (server-assigned fields omitted). */
export interface NewClientInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}
export interface NewPetInput {
  clientId: string;
  name: string;
  breed: string;
  size: DogSize;
  notes?: string;
}
export interface NewServiceInput {
  name: string;
  description: string;
  durationMin: number;
  priceGBP: number;
}
export interface NewAppointmentInput {
  petId: string;
  clientId: string;
  serviceId: string;
  start: string;
  source?: Appointment["source"];
  status?: AppointmentStatus;
  notes?: string;
}

interface StoreState {
  business: Business;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  appointments: Appointment[];
}

interface StoreContextValue extends StoreState {
  /** Demo session — null until the user clicks "continue as demo". */
  session: { businessId: string } | null;
  /** False until we've checked localStorage, to avoid auth-redirect flashes. */
  hydrated: boolean;

  loginAsDemo: () => void;
  logout: () => void;
  resetDemo: () => void;

  // Reads (joins kept here so screens stay thin)
  getClient: (id: string) => Client | undefined;
  getPet: (id: string) => Pet | undefined;
  getService: (id: string) => Service | undefined;
  getPetsForClient: (clientId: string) => Pet[];
  getHistoryForPet: (petId: string) => GroomingHistoryEntry[];

  // Writes
  addClient: (input: NewClientInput) => Client;
  addPet: (input: NewPetInput) => Pet;
  updatePetNotes: (petId: string, notes: string) => void;
  addService: (input: NewServiceInput) => Service;
  updateService: (id: string, patch: Partial<NewServiceInput>) => void;
  deleteService: (id: string) => void;
  createAppointment: (input: NewAppointmentInput) => Appointment;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointmentNotes: (id: string, notes: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/** Monotonic id generator with a readable prefix. */
function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Deterministic initial state (same on server + first client render).
  const [state, setState] = useState<StoreState>(() => createSeed());
  const [session, setSession] = useState<{ businessId: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const didLoad = useRef(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          state: StoreState;
          session: { businessId: string } | null;
        };
        if (parsed.state) setState(parsed.state);
        if (parsed.session) setSession(parsed.session);
      }
    } catch {
      // Corrupt/unavailable storage → fall back to the seed already in state.
    }
    setHydrated(true);
  }, []);

  // Persist on change (after initial hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, session }));
    } catch {
      // Ignore quota/availability errors — demo still works in memory.
    }
  }, [state, session, hydrated]);

  const loginAsDemo = useCallback(
    () => setSession({ businessId: state.business.id }),
    [state.business.id],
  );
  const logout = useCallback(() => setSession(null), []);
  const resetDemo = useCallback(() => {
    const fresh = createSeed();
    setState(fresh);
    setSession({ businessId: fresh.business.id });
  }, []);

  // ── Reads ────────────────────────────────────────────────────────────────
  const getClient = useCallback(
    (id: string) => state.clients.find((c) => c.id === id),
    [state.clients],
  );
  const getPet = useCallback(
    (id: string) => state.pets.find((p) => p.id === id),
    [state.pets],
  );
  const getService = useCallback(
    (id: string) => state.services.find((s) => s.id === id),
    [state.services],
  );
  const getPetsForClient = useCallback(
    (clientId: string) => state.pets.filter((p) => p.clientId === clientId),
    [state.pets],
  );
  const getHistoryForPet = useCallback(
    (petId: string): GroomingHistoryEntry[] =>
      state.appointments
        .filter((a) => a.petId === petId)
        .map((appointment) => {
          const service = state.services.find(
            (s) => s.id === appointment.serviceId,
          );
          return service ? { appointment, service } : null;
        })
        .filter((e): e is GroomingHistoryEntry => e !== null)
        .sort((a, b) => (a.appointment.start < b.appointment.start ? 1 : -1)),
    [state.appointments, state.services],
  );

  // ── Writes ───────────────────────────────────────────────────────────────
  const addClient = useCallback((input: NewClientInput): Client => {
    const client: Client = {
      id: makeId("cl"),
      businessId: "biz_1",
      createdAt: new Date().toISOString(),
      ...input,
    };
    setState((s) => ({ ...s, clients: [client, ...s.clients] }));
    return client;
  }, []);

  const addPet = useCallback((input: NewPetInput): Pet => {
    const pet: Pet = {
      id: makeId("pet"),
      notes: "",
      ...input,
    };
    setState((s) => ({ ...s, pets: [...s.pets, pet] }));
    return pet;
  }, []);

  const updatePetNotes = useCallback((petId: string, notes: string) => {
    setState((s) => ({
      ...s,
      pets: s.pets.map((p) => (p.id === petId ? { ...p, notes } : p)),
    }));
  }, []);

  const addService = useCallback((input: NewServiceInput): Service => {
    const service: Service = {
      id: makeId("svc"),
      businessId: "biz_1",
      active: true,
      ...input,
    };
    setState((s) => ({ ...s, services: [...s.services, service] }));
    return service;
  }, []);

  const updateService = useCallback(
    (id: string, patch: Partial<NewServiceInput>) => {
      setState((s) => ({
        ...s,
        services: s.services.map((sv) =>
          sv.id === id ? { ...sv, ...patch } : sv,
        ),
      }));
    },
    [],
  );

  const deleteService = useCallback((id: string) => {
    setState((s) => ({ ...s, services: s.services.filter((sv) => sv.id !== id) }));
  }, []);

  const createAppointment = useCallback(
    (input: NewAppointmentInput): Appointment => {
      const svc = state.services.find((s) => s.id === input.serviceId);
      const appointment: Appointment = {
        id: makeId("appt"),
        businessId: "biz_1",
        petId: input.petId,
        clientId: input.clientId,
        serviceId: input.serviceId,
        start: input.start,
        status: input.status ?? "pending",
        source: input.source ?? "staff",
        notes: input.notes ?? "",
        priceGBP: svc?.priceGBP ?? 0,
      };
      setState((s) => ({
        ...s,
        appointments: [...s.appointments, appointment],
      }));
      return appointment;
    },
    [state.services],
  );

  const setAppointmentStatus = useCallback(
    (id: string, status: AppointmentStatus) => {
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === id ? { ...a, status } : a,
        ),
      }));
    },
    [],
  );

  const updateAppointmentNotes = useCallback((id: string, notes: string) => {
    setState((s) => ({
      ...s,
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, notes } : a,
      ),
    }));
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      session,
      hydrated,
      loginAsDemo,
      logout,
      resetDemo,
      getClient,
      getPet,
      getService,
      getPetsForClient,
      getHistoryForPet,
      addClient,
      addPet,
      updatePetNotes,
      addService,
      updateService,
      deleteService,
      createAppointment,
      setAppointmentStatus,
      updateAppointmentNotes,
    }),
    [
      state,
      session,
      hydrated,
      loginAsDemo,
      logout,
      resetDemo,
      getClient,
      getPet,
      getService,
      getPetsForClient,
      getHistoryForPet,
      addClient,
      addPet,
      updatePetNotes,
      addService,
      updateService,
      deleteService,
      createAppointment,
      setAppointmentStatus,
      updateAppointmentNotes,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
