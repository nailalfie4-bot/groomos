/**
 * Seed data for the GroomOS demo — realistic UK dog-grooming examples.
 *
 * `createSeed()` is called once when the store initialises. Appointments are
 * generated *relative to today* so the dashboard and calendar always show live
 * data regardless of when the demo is opened.
 *
 * To swap in a real database later: replace the store's initial state (which
 * comes from here) with a fetch from your backend. The shapes already match
 * `lib/types.ts`, so nothing downstream changes.
 */

import type {
  Appointment,
  AppointmentStatus,
  Business,
  Client,
  CoatCondition,
  Groomer,
  GroomingReport,
  Pet,
  Service,
  Settings,
} from "@/lib/types";
import { atHour, addDays, startOfWeek } from "@/lib/format";
import { computeQuote, DEFAULT_SETTINGS } from "@/lib/pricing";

export interface SeedData {
  business: Business;
  clients: Client[];
  pets: Pet[];
  services: Service[];
  appointments: Appointment[];
  settings: Settings;
  groomers: Groomer[];
}

/** Two demo groomers so the calendar filter + assignment have something to show. */
const groomers: Groomer[] = [
  { id: "grm_1", businessId: "biz_1", name: "Alex (you)", colour: "#C9756B" },
  { id: "grm_2", businessId: "biz_1", name: "Sam", colour: "#6B8FC9" },
];

const business: Business = {
  id: "biz_1",
  name: "Paws & Co. Grooming",
  openHour: 9,
  closeHour: 17,
  stations: 1, // one self-employed groomer working from home
  addressLine: "14 Mill Lane",
  city: "Bristol",
  postcode: "BS1 4QA",
  phone: "0117 496 0042",
};

const services: Service[] = [
  {
    id: "svc_1",
    businessId: business.id,
    name: "Full Groom",
    description: "Bath, full haircut, nails, ears and a finishing spritz.",
    durationMin: 90,
    priceGBP: 45,
    active: true,
  },
  {
    id: "svc_2",
    businessId: business.id,
    name: "Bath & Tidy",
    description: "Wash, blow-dry, light tidy of face, feet and sanitary areas.",
    durationMin: 60,
    priceGBP: 30,
    active: true,
  },
  {
    id: "svc_3",
    businessId: business.id,
    name: "Puppy Intro",
    description: "Gentle first-visit groom to build confidence and handling.",
    durationMin: 45,
    priceGBP: 25,
    active: true,
  },
  {
    id: "svc_4",
    businessId: business.id,
    name: "Nail Clip",
    description: "Quick nail trim and file.",
    durationMin: 15,
    priceGBP: 12,
    active: true,
  },
  {
    id: "svc_5",
    businessId: business.id,
    name: "De-shed Treatment",
    description: "Deep de-shedding bath and blow-out for double coats.",
    durationMin: 75,
    priceGBP: 40,
    active: true,
  },
];

const clients: Client[] = [
  { id: "cl_1", businessId: business.id, firstName: "Hannah", lastName: "Reyes", email: "hannah.reyes@gmail.com", phone: "07712 884 219", createdAt: addDays(new Date(), -120).toISOString() },
  { id: "cl_2", businessId: business.id, firstName: "Theo", lastName: "Adeyemi", email: "t.adeyemi@outlook.com", phone: "07845 110 562", createdAt: addDays(new Date(), -98).toISOString() },
  { id: "cl_3", businessId: business.id, firstName: "Priya", lastName: "Nair", email: "priya.nair@gmail.com", phone: "07900 445 031", createdAt: addDays(new Date(), -76).toISOString() },
  { id: "cl_4", businessId: business.id, firstName: "Liam", lastName: "O'Shea", email: "liam.oshea@hotmail.co.uk", phone: "07533 902 188", createdAt: addDays(new Date(), -54).toISOString() },
  { id: "cl_5", businessId: business.id, firstName: "Sophie", lastName: "Clarke", email: "sophie.clarke@gmail.com", phone: "07419 233 770", createdAt: addDays(new Date(), -33).toISOString() },
  { id: "cl_6", businessId: business.id, firstName: "Marcus", lastName: "Bennett", email: "m.bennett@gmail.com", phone: "07688 512 904", createdAt: addDays(new Date(), -12).toISOString() },
  { id: "cl_7", businessId: business.id, firstName: "Erin", lastName: "Walsh", email: "erin.walsh@gmail.com", phone: "07566 201 884", createdAt: addDays(new Date(), -150).toISOString() },
  { id: "cl_8", businessId: business.id, firstName: "Owen", lastName: "Pryce", email: "owen.pryce@outlook.com", phone: "07722 640 117", createdAt: addDays(new Date(), -200).toISOString() },
];

const pets: Pet[] = [
  { id: "pet_1", clientId: "cl_1", name: "Biscuit", breed: "Cockapoo", size: "medium", coatType: "Curly", temperament: "Easygoing", notes: "Loves the dryer. Slightly matted behind ears — keep on top of it.", dateOfBirth: addDays(new Date(), -365 * 3).toISOString(), rebookWeeks: 6 },
  { id: "pet_2", clientId: "cl_2", name: "Maple", breed: "Cavalier King Charles Spaniel", size: "small", coatType: "Silky", temperament: "Sensitive", notes: "Sensitive skin — use the oatmeal shampoo only.", dateOfBirth: addDays(new Date(), -365 * 2).toISOString(), rebookWeeks: 8 },
  { id: "pet_3", clientId: "cl_3", name: "Juno", breed: "Border Collie", size: "medium", coatType: "Double", temperament: "Nervous", notes: "Nervous of clippers around the face. Go slow, lots of breaks.", dateOfBirth: addDays(new Date(), -365 * 5).toISOString(), rebookWeeks: 8 },
  { id: "pet_4", clientId: "cl_4", name: "Cooper", breed: "Golden Retriever", size: "large", coatType: "Double", temperament: "Friendly", notes: "Heavy double coat. De-shed every visit. Very food motivated.", dateOfBirth: addDays(new Date(), -365 * 4).toISOString(), rebookWeeks: 8 },
  { id: "pet_5", clientId: "cl_5", name: "Bramble", breed: "Miniature Schnauzer", size: "small", coatType: "Wiry", temperament: "Confident", notes: "Classic schnauzer trim. Beard needs hand-stripping.", dateOfBirth: addDays(new Date(), -365 * 6).toISOString(), rebookWeeks: 6 },
  { id: "pet_6", clientId: "cl_6", name: "Nala", breed: "Labradoodle", size: "large", coatType: "Curly", temperament: "Shy", notes: "First few visits — still building confidence on the table.", dateOfBirth: addDays(new Date(), -300).toISOString(), rebookWeeks: 6 },
  { id: "pet_7", clientId: "cl_1", name: "Pip", breed: "Jack Russell Terrier", size: "small", coatType: "Smooth", temperament: "Busy", notes: "Just nails and a tidy. In and out, no fuss.", dateOfBirth: addDays(new Date(), -365 * 7).toISOString() },
  { id: "pet_8", clientId: "cl_3", name: "Bear", breed: "Bernese Mountain Dog", size: "giant", coatType: "Double", temperament: "Gentle", notes: "Gentle giant. Big coat, mats behind the legs — needs extra time.", dateOfBirth: addDays(new Date(), -365 * 2).toISOString(), rebookWeeks: 8 },
  { id: "pet_9", clientId: "cl_7", name: "Coco", breed: "Toy Poodle", size: "small", coatType: "Curly", temperament: "Lively", notes: "Pom-pom feet, loves a bow. Hasn't been in for a while.", dateOfBirth: addDays(new Date(), -365 * 4).toISOString(), rebookWeeks: 6 },
  { id: "pet_10", clientId: "cl_8", name: "Rusty", breed: "Cocker Spaniel", size: "medium", coatType: "Feathered", temperament: "Soppy", notes: "Ears need regular attention. Due a proper groom.", dateOfBirth: addDays(new Date(), -365 * 5).toISOString(), rebookWeeks: 6 },
];

/** Build a varied, realistic appointment book around today. */
function buildAppointments(): Appointment[] {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const out: Appointment[] = [];
  let n = 0;

  const make = (
    dayOffsetFromWeekStart: number,
    hour: number,
    petId: string,
    clientId: string,
    serviceId: string,
    status: AppointmentStatus,
    source: Appointment["source"] = "staff",
    notes = "",
    coatCondition: CoatCondition = "smooth",
    report?: GroomingReport,
  ) => {
    const svc = services.find((s) => s.id === serviceId)!;
    const pet = pets.find((p) => p.id === petId)!;
    const quote = computeQuote(svc, pet.size, coatCondition, DEFAULT_SETTINGS, pet.name);
    const day = addDays(weekStart, dayOffsetFromWeekStart);
    out.push({
      id: `appt_${++n}`,
      businessId: business.id,
      petId,
      clientId,
      serviceId,
      start: atHour(day, hour),
      status,
      source,
      notes,
      priceGBP: quote.totalPriceGBP,
      coatCondition,
      durationMin: quote.totalDurationMin,
      report,
    });
  };

  // Today (weekStart + getDay offset). Compute today's offset within the week.
  const todayOffset = (today.getDay() + 6) % 7;

  // --- Today: a full, realistic day that fits the board with no overlaps ---
  make(todayOffset, 9, "pet_1", "cl_1", "svc_1", "confirmed");
  make(todayOffset, 11, "pet_2", "cl_2", "svc_2", "confirmed");
  make(todayOffset, 12.5, "pet_7", "cl_1", "svc_4", "pending", "online");
  make(todayOffset, 13, "pet_8", "cl_3", "svc_1", "confirmed", "online", "", "matted"); // giant + matted: matting meter + buffer in action
  make(todayOffset, 16, "pet_5", "cl_5", "svc_2", "confirmed");

  // --- Rest of this week ---
  make(todayOffset + 1, 9.5, "pet_3", "cl_3", "svc_2", "confirmed", "staff", "", "tangled");
  make(todayOffset + 1, 11.5, "pet_1", "cl_1", "svc_1", "confirmed");
  make(todayOffset + 2, 10, "pet_4", "cl_4", "svc_5", "pending");
  make(todayOffset + 2, 14, "pet_2", "cl_2", "svc_2", "confirmed", "online");

  // --- Earlier this month: history (completed / no-show / cancelled) ---
  make(todayOffset - 9, 9, "pet_1", "cl_1", "svc_1", "completed", "staff", "Full groom — coat in great condition. Nails done.", "smooth", {
    summary: "Biscuit was a star today — full groom, coat soft and tangle-free, nails trimmed. See you in 6 weeks!",
    createdAt: addDays(new Date(), -9).toISOString(),
    beforePhoto: "before",
    afterPhoto: "after",
  });
  make(todayOffset - 9, 11, "pet_5", "cl_5", "svc_1", "completed", "staff", "Hand-stripped beard, classic schnauzer outline.");
  make(todayOffset - 8, 13, "pet_4", "cl_4", "svc_5", "completed", "online", "Big de-shed, lots of undercoat out. Happy boy.", "tangled", {
    summary: "Cooper had a lovely de-shed — masses of undercoat out, coat gleaming. He enjoyed every minute.",
    createdAt: addDays(new Date(), -8).toISOString(),
    beforePhoto: "before",
    afterPhoto: "after",
  });
  make(todayOffset - 7, 10, "pet_3", "cl_3", "svc_2", "no-show", "online", "Did not arrive, no answer on phone.");
  make(todayOffset - 6, 15, "pet_2", "cl_2", "svc_2", "completed", "staff", "Oatmeal shampoo, skin looked settled.");
  make(todayOffset - 5, 9.5, "pet_6", "cl_6", "svc_3", "completed", "staff", "Second puppy visit — much calmer on the table.");
  make(todayOffset - 4, 14, "pet_7", "cl_1", "svc_4", "cancelled", "staff", "Client rescheduled.");
  make(todayOffset - 3, 11, "pet_1", "cl_1", "svc_2", "completed", "online", "Bath & tidy between full grooms.");
  // A couple of older completed grooms so retention/"due for a groom" has signal.
  make(todayOffset - 40, 10, "pet_6", "cl_6", "svc_1", "completed", "staff", "Full groom.");
  make(todayOffset - 52, 13, "pet_4", "cl_4", "svc_1", "completed", "staff", "Full groom.");

  // --- Lapsed clients: overdue with nothing booked ahead (powers retention) ---
  make(todayOffset - 63, 11, "pet_9", "cl_7", "svc_1", "completed", "staff", "Full groom — lovely curly coat.");
  make(todayOffset - 78, 14, "pet_10", "cl_8", "svc_1", "completed", "staff", "Full groom, ears cleaned.");

  // Deposits secure most bookings — no-show protection working in the demo.
  // Spread bookings across the two demo groomers so the calendar filter is lively.
  out.forEach((a, i) => {
    if (a.status !== "cancelled") a.deposit = DEFAULT_SETTINGS.depositAmount;
    a.groomerId = groomers[i % groomers.length].id;
  });

  return out;
}

export function createSeed(): SeedData {
  return {
    business,
    clients,
    pets,
    services,
    appointments: buildAppointments(),
    settings: { ...DEFAULT_SETTINGS },
    groomers,
  };
}

/**
 * A valid but empty starting state for real (Supabase-configured) accounts, so
 * they begin with a clean book — no demo clients, pets, services or bookings.
 * Real data is loaded per-screen from Supabase; the business name and settings
 * are filled in as those screens migrate. Demo mode uses `createSeed()` instead.
 */
export function createEmptySeed(): SeedData {
  return {
    business: {
      id: "",
      name: "Your business",
      openHour: 9,
      closeHour: 17,
      stations: 1,
      addressLine: "",
      city: "",
      postcode: "",
      phone: "",
    },
    clients: [],
    pets: [],
    services: [],
    appointments: [],
    settings: { ...DEFAULT_SETTINGS },
    groomers: [],
  };
}
