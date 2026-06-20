/**
 * GroomOS domain types.
 *
 * These describe the shape of every entity in the app. The mock store in
 * `lib/mock/store.tsx` holds them in memory; when swapping to a real database
 * later, these same types map directly to table rows / API responses, so the
 * UI layer needs no changes.
 */

export type ID = string;

/** The grooming business the demo user "owns". */
export interface Business {
  id: ID;
  name: string;
  /** Working day start/end in 24h decimal hours, e.g. 9 and 17. */
  openHour: number;
  closeHour: number;
  /** Number of grooming stations — used for utilisation capacity. */
  stations: number;
  addressLine: string;
  city: string;
  postcode: string;
  phone: string;
}

export interface Client {
  id: ID;
  businessId: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** ISO date string. */
  createdAt: string;
}

export type DogSize = "small" | "medium" | "large";

export interface Pet {
  id: ID;
  clientId: ID;
  name: string;
  breed: string;
  size: DogSize;
  /** Free-text standing notes: temperament, allergies, coat, handling. */
  notes: string;
  /** ISO date string of birth (optional). */
  dateOfBirth?: string;
}

export interface Service {
  id: ID;
  businessId: ID;
  name: string;
  description: string;
  durationMin: number;
  priceGBP: number;
  active: boolean;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "no-show"
  | "cancelled";

/** Where the booking came from — staff console or the public self-book page. */
export type AppointmentSource = "staff" | "online";

export interface Appointment {
  id: ID;
  businessId: ID;
  petId: ID;
  clientId: ID;
  serviceId: ID;
  /** ISO datetime of the slot start. End is derived from service duration. */
  start: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  /** Per-visit notes (what was done, observations). */
  notes: string;
  /** Price captured at booking time, in case the service price later changes. */
  priceGBP: number;
}

/** A pet's history row, derived by joining appointments + services. */
export interface GroomingHistoryEntry {
  appointment: Appointment;
  service: Service;
}
