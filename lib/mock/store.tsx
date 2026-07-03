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
import { toast } from "sonner";
import { createSeed, createEmptySeed } from "@/lib/mock/seed";
import { computeQuote } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useAuth } from "@/components/auth-provider";
import { fetchClients, insertClient } from "@/lib/data/clients";
import {
  fetchPets,
  insertPet,
  updatePetNotes as updatePetNotesRow,
} from "@/lib/data/pets";
import {
  fetchServices,
  insertService,
  updateService as updateServiceRow,
  deleteService as deleteServiceRow,
} from "@/lib/data/services";
import {
  fetchAppointments,
  insertAppointment,
  setAppointmentStatusRow,
  updateAppointmentNotesRow,
  rescheduleAppointmentRow,
  attachReportRow,
  markReminderSentRow,
  isClashError,
} from "@/lib/data/appointments";
import { fetchSettings, updateSettingsRow } from "@/lib/data/settings";
import { fetchBusiness, updateBusinessRow } from "@/lib/data/business";

/** Which collections a rollback should re-pull from the database. */
type Collection =
  | "clients"
  | "pets"
  | "services"
  | "appointments"
  | "settings"
  | "business";

// Bumped when seed/shape changes (v7: auth/session moved to real Supabase).
const STORAGE_KEY = "groomos.demo.v7";

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
  /** False until we've checked localStorage, to avoid first-paint flashes. */
  hydrated: boolean;

  /** Reset the mock data back to a fresh seed (Reset demo data). */
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
  // Real (Supabase) accounts start from a clean, empty book; the public demo
  // uses the rich seed. Screens read real data from Supabase via their own
  // hooks — this mock store is the demo source and the not-yet-migrated
  // screens' fallback.
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const { businessId } = useAuth();
  // "Live" = real Supabase data for the signed-in tenant. Otherwise the demo.
  const live = configured && !!businessId;

  // Deterministic initial state (same on server + first client render). On mount
  // configured mode clears this seed and loads real data; demo keeps it.
  const [state, setState] = useState<StoreState>(() => createSeed());
  const [hydrated, setHydrated] = useState(false);
  const didLoad = useRef(false);
  const loadedBiz = useRef<string | null>(null);

  // On mount: demo mode restores from localStorage and is immediately ready;
  // configured mode clears the seed and waits for the Supabase load below.
  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;
    if (configured) {
      setState(createEmptySeed());
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { state: StoreState };
          if (parsed.state) setState(parsed.state);
        }
      } catch {
        // Corrupt/unavailable storage → fall back to the seed already in state.
      }
      setHydrated(true);
    }
  }, [configured]);

  // Configured mode: load the signed-in user's real, tenant-scoped data once the
  // business id resolves. This store is then the single source of truth for
  // every screen (clients, pets, services, appointments, settings, business).
  useEffect(() => {
    if (!configured || !businessId) return;
    if (loadedBiz.current === businessId) return;
    loadedBiz.current = businessId;
    let active = true;
    Promise.all([
      fetchClients(businessId),
      fetchPets(businessId),
      fetchServices(businessId),
      fetchAppointments(businessId),
      fetchSettings(businessId),
      fetchBusiness(businessId),
    ])
      .then(([clients, pets, services, appointments, settings, business]) => {
        if (!active) return;
        setState((s) => ({
          clients,
          pets,
          services,
          appointments,
          settings,
          business: business ?? s.business,
        }));
        setHydrated(true);
      })
      .catch((e) => {
        console.error("Failed to load tenant data", e);
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [configured, businessId]);

  // Persist on change (demo mode only — never cache a real account's state).
  useEffect(() => {
    if (!hydrated || configured) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state }));
    } catch {
      // Ignore quota/availability errors — demo still works in memory.
    }
  }, [state, hydrated, configured]);

  // Re-pull collections from the database (used to roll back a failed write).
  const reload = useCallback(
    async (keys: Collection[]) => {
      if (!businessId) return;
      const patch: Partial<StoreState> = {};
      await Promise.all(
        keys.map(async (k) => {
          if (k === "clients") patch.clients = await fetchClients(businessId);
          else if (k === "pets") patch.pets = await fetchPets(businessId);
          else if (k === "services") patch.services = await fetchServices(businessId);
          else if (k === "appointments") patch.appointments = await fetchAppointments(businessId);
          else if (k === "settings") patch.settings = await fetchSettings(businessId);
          else if (k === "business") {
            const b = await fetchBusiness(businessId);
            if (b) patch.business = b;
          }
        }),
      );
      setState((s) => ({ ...s, ...patch }));
    },
    [businessId],
  );

  // Background Supabase writes are serialized so dependent ones stay ordered
  // (e.g. a client is inserted before its pet, satisfying the FK). On failure we
  // roll the affected collection(s) back to database truth and tell the user;
  // the optimistic UI stays snappy in the meantime.
  const writeChain = useRef<Promise<unknown>>(Promise.resolve());
  const persist = useCallback(
    (run: () => Promise<unknown>, rollback: Collection[], clashAware = false) => {
      writeChain.current = writeChain.current
        .then(() => run())
        .catch(async (e) => {
          console.error("Supabase write failed", e);
          toast.error(
            clashAware && isClashError(e)
              ? "That time clashes with another booking (including cleanup time)."
              : "Couldn't save that change — it's been rolled back.",
          );
          try {
            await reload(rollback);
          } catch {
            /* best-effort rollback */
          }
        });
    },
    [reload],
  );

  const resetDemo = useCallback(() => {
    setState(configured ? createEmptySeed() : createSeed());
  }, [configured]);

  /** New id: a real UUID for live rows, a readable mock id for the demo. */
  const newId = useCallback(
    (prefix: string) => (live ? crypto.randomUUID() : makeId(prefix)),
    [live],
  );

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
  const addClient = useCallback(
    (input: NewClientInput): Client => {
      const client: Client = {
        id: newId("cl"),
        businessId: businessId ?? "biz_1",
        createdAt: new Date().toISOString(),
        ...input,
      };
      setState((s) => ({ ...s, clients: [client, ...s.clients] }));
      if (live && businessId) {
        persist(() => insertClient(businessId, input, client.id), ["clients"]);
      }
      return client;
    },
    [live, businessId, newId, persist],
  );

  const addPet = useCallback(
    (input: NewPetInput): Pet => {
      const pet: Pet = { id: newId("pet"), notes: "", ...input };
      setState((s) => ({ ...s, pets: [...s.pets, pet] }));
      if (live && businessId) {
        persist(() => insertPet(businessId, input, pet.id), ["pets"]);
      }
      return pet;
    },
    [live, businessId, newId, persist],
  );

  const updatePetNotes = useCallback(
    (petId: string, notes: string) => {
      setState((s) => ({
        ...s,
        pets: s.pets.map((p) => (p.id === petId ? { ...p, notes } : p)),
      }));
      if (live) persist(() => updatePetNotesRow(petId, notes), ["pets"]);
    },
    [live, persist],
  );

  const addService = useCallback(
    (input: NewServiceInput): Service => {
      const service: Service = {
        id: newId("svc"),
        businessId: businessId ?? "biz_1",
        active: true,
        ...input,
      };
      setState((s) => ({ ...s, services: [...s.services, service] }));
      if (live && businessId) {
        persist(() => insertService(businessId, input, service.id), ["services"]);
      }
      return service;
    },
    [live, businessId, newId, persist],
  );

  const updateService = useCallback(
    (id: string, patch: Partial<NewServiceInput>) => {
      setState((s) => ({
        ...s,
        services: s.services.map((sv) =>
          sv.id === id ? { ...sv, ...patch } : sv,
        ),
      }));
      if (live) persist(() => updateServiceRow(id, patch), ["services"]);
    },
    [live, persist],
  );

  const deleteService = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, services: s.services.filter((sv) => sv.id !== id) }));
      if (live) persist(() => deleteServiceRow(id), ["services"]);
    },
    [live, persist],
  );

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
        id: newId("appt"),
        businessId: businessId ?? "biz_1",
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
      // The DB enforces no clashes/buffer overlaps (exclusion constraint); a
      // 23P01 rolls this optimistic add back with a clash message.
      if (live && businessId) {
        persist(() => insertAppointment(appointment), ["appointments"], true);
      }
      return appointment;
    },
    [state.services, state.pets, state.settings, live, businessId, newId, persist],
  );

  const rescheduleAppointment = useCallback(
    (id: string, start: string) => {
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === id ? { ...a, start } : a,
        ),
      }));
      if (live) persist(() => rescheduleAppointmentRow(id, start), ["appointments"], true);
    },
    [live, persist],
  );

  const attachReport = useCallback(
    (id: string, report: GroomingReport) => {
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === id ? { ...a, report, status: "completed" } : a,
        ),
      }));
      if (live) persist(() => attachReportRow(id, report), ["appointments"]);
    },
    [live, persist],
  );

  const markReminderSent = useCallback(
    (petId: string) => {
      const when = new Date().toISOString();
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.petId === petId && a.status === "completed"
            ? { ...a, reminderSentAt: when }
            : a,
        ),
      }));
      if (live && businessId) {
        persist(() => markReminderSentRow(businessId, petId, when), ["appointments"]);
      }
    },
    [live, businessId, persist],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      if (live && businessId) {
        persist(() => updateSettingsRow(businessId, patch), ["settings"]);
      }
    },
    [live, businessId, persist],
  );

  const updateBusiness = useCallback(
    (patch: Partial<Business>) => {
      setState((s) => ({ ...s, business: { ...s.business, ...patch } }));
      if (live && businessId) {
        persist(() => updateBusinessRow(businessId, patch), ["business"]);
      }
    },
    [live, businessId, persist],
  );

  const setAppointmentStatus = useCallback(
    (id: string, status: AppointmentStatus) => {
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === id ? { ...a, status } : a,
        ),
      }));
      if (live) persist(() => setAppointmentStatusRow(id, status), ["appointments"]);
    },
    [live, persist],
  );

  const updateAppointmentNotes = useCallback(
    (id: string, notes: string) => {
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === id ? { ...a, notes } : a,
        ),
      }));
      if (live) persist(() => updateAppointmentNotesRow(id, notes), ["appointments"]);
    },
    [live, persist],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      ...state,
      hydrated,
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
      hydrated,
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
