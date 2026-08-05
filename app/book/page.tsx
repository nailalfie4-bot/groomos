"use client";

/**
 * Demo booking page (/book) — the "See the booking page" link from the landing.
 *
 * It renders the exact same <PublicBooking> flow as the real /book/[slug] page,
 * so the demo and the live customer experience can never drift apart. To stay
 * reliable in every mode (including a Supabase-configured production, where the
 * mock store clears its seed), it is fully self-contained: fixed demo data,
 * client-side slots, and a no-op submit. Nothing is persisted.
 */
import {
  PublicBooking,
  type PublicBookingResult,
  type PublicBookingSubmit,
} from "@/components/public-booking";
import type { MonthAvailability } from "@/components/booking-calendar";
import { DEFAULT_SETTINGS } from "@/lib/pricing";
import type { Business, Service, Settings } from "@/lib/types";

const business: Business = {
  id: "demo",
  name: "Paws & Co.",
  slug: "demo",
  openHour: 9,
  closeHour: 17,
  stations: 1,
  addressLine: "22 Meadow Lane",
  city: "Manchester",
  postcode: "M20 2AB",
  phone: "",
  closedWeekdays: [],
};

const services: Service[] = [
  { id: "svc-full", businessId: "demo", name: "Full Groom", description: "Wash, dry, full clip & style", durationMin: 90, priceGBP: 45, active: true },
  { id: "svc-bath", businessId: "demo", name: "Bath & Tidy", description: "Wash, blow-dry, nails & a tidy up", durationMin: 60, priceGBP: 30, active: true },
  { id: "svc-puppy", businessId: "demo", name: "Puppy's First Groom", description: "A gentle intro for pups under 6 months", durationMin: 45, priceGBP: 25, active: true },
  // Add-ons — extras the client can tack onto any groom. "Nail trim" and "Teeth
  // cleaning" are also bookable on their own (standalone minor services).
  { id: "add-teeth", businessId: "demo", name: "Teeth cleaning", description: "A quick freshen-up.", durationMin: 10, priceGBP: 8, active: true, isAddon: true, bookableAlone: true },
  { id: "add-nails", businessId: "demo", name: "Nail trim", description: "In and out — nails only.", durationMin: 15, priceGBP: 6, active: true, isAddon: true, bookableAlone: true },
  { id: "add-deshed", businessId: "demo", name: "De-shed treatment", description: "", durationMin: 20, priceGBP: 12, active: true, isAddon: true },
];

// Demo settings: default scales + sample terms so the "checks" step (matting +
// temperament scales, T&Cs, signature) is visible. The riskiest levels are
// marked "not accepted" to demo the kind contact-us gate.
const settings: Settings = {
  ...DEFAULT_SETTINGS,
  termsText:
    "Deposits are non-refundable within 48 hours of your appointment.\n\n" +
    "Please arrive on time — arrivals more than 15 minutes late may need to rebook.\n\n" +
    "Matted coats may need to be clipped short for your dog's welfare; we'll always talk you through it first.",
  mattingScale: {
    ...DEFAULT_SETTINGS.mattingScale,
    levels: DEFAULT_SETTINGS.mattingScale.levels.map((l) =>
      l.id === "pelted" ? { ...l, accepted: false } : l,
    ),
  },
  temperamentScale: {
    ...DEFAULT_SETTINGS.temperamentScale,
    levels: DEFAULT_SETTINGS.temperamentScale.levels.map((l) =>
      l.id === "unsafe" ? { ...l, accepted: false } : l,
    ),
  },
};

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Plausible open slots for a day: 09:00–17:00 on the half hour, a couple already
 *  taken, and no times in the past on today. */
async function fetchSlots(date: string, minutes: number): Promise<string[]> {
  const open = 9 * 60;
  const close = 17 * 60;
  const taken = new Set(["11:00", "14:30"]);
  const today = toDateValue(new Date());
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  const out: string[] = [];
  for (let m = open; m + minutes <= close; m += 30) {
    const label = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    if (taken.has(label)) continue;
    if (date === today && m <= now + 30) continue;
    out.push(label);
  }
  return out;
}

/** Per-day bookability for a month — mirrors the server's month endpoint, with a
 *  3-month demo window. */
async function fetchMonth(month: string, minutes: number): Promise<MonthAvailability> {
  const today = toDateValue(new Date());
  const n = new Date();
  const windowLastDate = toDateValue(new Date(n.getFullYear(), n.getMonth() + 3, n.getDate()));
  const [y, mo] = month.split("-").map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const bookable: Record<string, boolean> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;
    if (dateStr < today || dateStr > windowLastDate) {
      bookable[dateStr] = false;
      continue;
    }
    bookable[dateStr] = (await fetchSlots(dateStr, minutes)).length > 0;
  }
  return { today, windowLastDate, bookable };
}

async function submitBooking(_input: PublicBookingSubmit): Promise<PublicBookingResult> {
  return { ok: true, depositDue: settings.depositEnabled ? settings.depositAmount : 0 };
}

export default function DemoBookingPage() {
  return (
    <PublicBooking
      business={business}
      services={services}
      settings={settings}
      fetchSlots={fetchSlots}
      fetchMonth={fetchMonth}
      submitBooking={submitBooking}
    />
  );
}
