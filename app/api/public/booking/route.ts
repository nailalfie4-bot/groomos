/**
 * POST /api/public/booking
 * Creates a booking (client + pet + pending appointment) for a business slug,
 * on behalf of an anonymous visitor. Runs server-side with the service-role
 * client; the DB's no-overlap constraint guarantees no double-booking.
 *
 * Body: { slug, serviceId, startISO, size, coat, firstName, lastName, email,
 *         phone, petName, breed }
 */
import { NextResponse } from "next/server";
import { createPublicBooking, type PublicBookingInput } from "@/lib/data/public-booking";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "Booking isn't available here." },
      { status: 404 },
    );
  }

  let body: Partial<PublicBookingInput>;
  try {
    body = (await request.json()) as Partial<PublicBookingInput>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_input", message: "Bad request." }, { status: 400 });
  }

  const input: PublicBookingInput = {
    slug: String(body.slug ?? ""),
    serviceId: String(body.serviceId ?? ""),
    startISO: String(body.startISO ?? ""),
    size: (body.size ?? "medium") as PublicBookingInput["size"],
    coat: (body.coat ?? "smooth") as PublicBookingInput["coat"],
    firstName: String(body.firstName ?? ""),
    lastName: String(body.lastName ?? ""),
    email: String(body.email ?? ""),
    phone: String(body.phone ?? ""),
    petName: String(body.petName ?? ""),
    breed: String(body.breed ?? ""),
    paymentIntentId: body.paymentIntentId ? String(body.paymentIntentId) : undefined,
    declarations: Array.isArray(body.declarations) ? body.declarations.map(String) : undefined,
    termsSignedName: body.termsSignedName ? String(body.termsSignedName) : undefined,
    mattingLevelId: body.mattingLevelId ? String(body.mattingLevelId) : undefined,
    temperamentLevelId: body.temperamentLevelId ? String(body.temperamentLevelId) : undefined,
    addonIds: Array.isArray(body.addonIds) ? body.addonIds.map(String) : undefined,
  };

  try {
    const result = await createPublicBooking(input);
    if (!result.ok) {
      const status =
        result.error === "not_found" ? 404 : result.error === "slot_taken" ? 409 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Something went wrong — please try again." },
      { status: 500 },
    );
  }
}
