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
  BookingQuote,
  Business,
  Client,
  CoatCondition,
  DogSize,
  GroomingHistoryEntry,
  GroomingReport,
  Pet,
  Service,
  Settings,
} from "@/lib/types";
import { createSeed } from "@/lib/mock/seed";
import { computeQuote } from "@/lib/pricing";

// Bumped when seed/shape changes (v6: booking deposits / no-show protection).
const STORAGE_KEY = "groomos.demo.v6";

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
  coatType?: string;
  temperament?: string;
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
  /** Owner-declared coat condition (matting meter). Defaults to "smooth". */
  coatCondition?: CoatCondition;
  /** Optional size override for this booking; defaults to the pet's size. */
  size?: DogSize;
  /** Deposit taken to secure the booking (GBP). */
  deposit?: number;
}

interface StoreState {
  business: Business;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  appointments: Appointment[];
  settings: Settings;
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
  /** Most recent completed groom date for a pet, or undefined. */
  getLastGroomedAt: (petId: string) => string | undefined;
  /** Pets overdue for a groom with no upcoming booking — for retention. */
  getDueForGroom: () => DueForGroom[];
  /** Live matting-meter quote for a prospective booking. */
  quoteFor: (
    serviceId: string,
    size: DogSize,
    coat: CoatCondition,
    petName?: string,
  ) => BookingQuote | null;

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
  /** Reschedule an appointment to a new ISO start (calendar drag). */
  rescheduleAppointment: (id: string, start: string) => void;
  /** Attach a before/after report to a completed appointment. */
  attachReport: (id: string, report: GroomingReport) => void;
  /** Mark a friendly retention reminder as sent (mock). */
  markReminderSent: (petId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Update business details (name, hours, contact) from Settings. */
  updateBusiness: (patch: Partial<Business>) => void;
}

/** A pet that's overdue for a groom, with retention context. */
export interface DueForGroom {
  pet: Pet;
  client: Client;
  lastGroomedAt: string;
  weeksSince: number;
  lastPriceGBP: number;
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

  const getLastGroomedAt = useCallback(
    (petId: string): string | undefined =>
      state.appointments
        .filter((a) => a.petId === petId && a.status === "completed")
        .map((a) => a.start)
        .sort()
        .at(-1),
    [state.appointments],
  );

  const getDueForGroom = useCallback((): DueForGroom[] => {
    const now = Date.now();
    const weeks = (ms: number) => ms / (1000 * 60 * 60 * 24 * 7);
    return state.pets
      .map((pet): DueForGroom | null => {
        const past = state.appointments
          .filter((a) => a.petId === pet.id && a.status === "completed")
          .sort((a, b) => (a.start < b.start ? 1 : -1));
        const last = past[0];
        if (!last) return null;
        // Skip pets that already have something on the books ahead.
        const hasUpcoming = state.appointments.some(
          (a) =>
            a.petId === pet.id &&
            new Date(a.start).getTime() >= now &&
            (a.status === "pending" || a.status === "confirmed"),
        );
        if (hasUpcoming) return null;
        const weeksSince = Math.floor(
          weeks(now - new Date(last.start).getTime()),
        );
        if (weeksSince < state.settings.defaultRebookWeeks) return null;
        const client = state.clients.find((c) => c.id === pet.clientId);
        if (!client) return null;
        return {
          pet,
          client,
          lastGroomedAt: last.start,
          weeksSince,
          lastPriceGBP: last.priceGBP,
        };
      })
      .filter((d): d is DueForGroom => d !== null)
      .sort((a, b) => b.weeksSince - a.weeksSince);
  }, [state.pets, state.appointments, state.clients, state.settings]);

  const quoteFor = useCallback(
    (
      serviceId: string,
      size: DogSize,
      coat: CoatCondition,
      petName = "your dog",
    ): BookingQuote | null => {
      const svc = state.services.find((s) => s.id === serviceId);
      if (!svc) return null;
      return computeQuote(svc, size, coat, state.settings, petName);
    },
    [state.services, state.settings],
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
      const pet = state.pets.find((p) => p.id === input.petId);
      const coat = input.coatCondition ?? "smooth";
      const size = input.size ?? pet?.size ?? "medium";
      // Price + duration come from the matting meter so surcharges are baked in.
      const quote = svc
        ? computeQuote(svc, size, coat, state.settings, pet?.name)
        : null;
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
        priceGBP: quote?.totalPriceGBP ?? svc?.priceGBP ?? 0,
        coatCondition: coat,
        durationMin: quote?.totalDurationMin ?? svc?.durationMin ?? 60,
        deposit: input.deposit,
      };
      setState((s) => ({
        ...s,
        appointments: [...s.appointments, appointment],
      }));
      return appointment;
    },
    [state.services, state.pets, state.settings],
  );

  const rescheduleAppointment = useCallback((id: string, start: string) => {
    setState((s) => ({
      ...s,
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, start } : a,
      ),
    }));
  }, []);

  const attachReport = useCallback((id: string, report: GroomingReport) => {
    setState((s) => ({
      ...s,
      appointments: s.appointments.map((a) =>
        a.id === id ? { ...a, report, status: "completed" } : a,
      ),
    }));
  }, []);

  const markReminderSent = useCallback((petId: string) => {
    const when = new Date().toISOString();
    setState((s) => ({
      ...s,
      appointments: s.appointments.map((a) =>
        a.petId === petId && a.status === "completed"
          ? { ...a, reminderSentAt: when }
          : a,
      ),
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const updateBusiness = useCallback((patch: Partial<Business>) => {
    setState((s) => ({ ...s, business: { ...s.business, ...patch } }));
  }, []);

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
      getLastGroomedAt,
      getDueForGroom,
      quoteFor,
      addClient,
      addPet,
      updatePetNotes,
      addService,
      updateService,
      deleteService,
      createAppointment,
      setAppointmentStatus,
      updateAppointmentNotes,
      rescheduleAppointment,
      attachReport,
      markReminderSent,
      updateSettings,
      updateBusiness,
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
      getLastGroomedAt,
      getDueForGroom,
      quoteFor,
      addClient,
      addPet,
      updatePetNotes,
      addService,
      updateService,
      deleteService,
      createAppointment,
      setAppointmentStatus,
      updateAppointmentNotes,
      rescheduleAppointment,
      attachReport,
      markReminderSent,
      updateSettings,
      updateBusiness,
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
