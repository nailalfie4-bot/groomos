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
import { DEFAULT_SETTINGS } from "@/lib/pricing";
import type { Business, Service } from "@/lib/types";

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
};

const services: Service[] = [
  { id: "svc-full", businessId: "demo", name: "Full Groom", description: "Wash, dry, full clip & style", durationMin: 90, priceGBP: 45, active: true },
  { id: "svc-bath", businessId: "demo", name: "Bath & Tidy", description: "Wash, blow-dry, nails & a tidy up", durationMin: 60, priceGBP: 30, active: true },
  { id: "svc-puppy", businessId: "demo", name: "Puppy's First Groom", description: "A gentle intro for pups under 6 months", durationMin: 45, priceGBP: 25, active: true },
];

const settings = DEFAULT_SETTINGS;

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
      submitBooking={submitBooking}
    />
  );
}
