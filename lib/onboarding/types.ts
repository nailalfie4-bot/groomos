/** Shared types for founder-assisted onboarding (invite-based). */

export type InviteStatus = "sent" | "accepted" | "expired";

export interface Invite {
  id: string;
  email: string;
  businessName: string;
  /** Stored DB status ('expired' is derived on read). */
  status: "sent" | "accepted";
  sentAt: string;
  acceptedAt: string | null;
  expiresAt: string;
}

export interface InviteRow {
  id: string;
  email: string;
  business_name: string;
  status: string;
  sent_at: string;
  accepted_at: string | null;
  expires_at: string;
}

export function rowToInvite(r: InviteRow): Invite {
  return {
    id: r.id,
    email: r.email,
    businessName: r.business_name,
    status: r.status === "accepted" ? "accepted" : "sent",
    sentAt: r.sent_at,
    acceptedAt: r.accepted_at,
    expiresAt: r.expires_at,
  };
}

/** Display status including the derived 'expired'. */
export function displayStatus(inv: Pick<Invite, "status" | "expiresAt">): InviteStatus {
  if (inv.status === "accepted") return "accepted";
  if (new Date(inv.expiresAt).getTime() < Date.now()) return "expired";
  return "sent";
}

export interface ServiceDraft {
  name: string;
  priceGBP: number;
  durationMin: number;
}

export interface OnboardInput {
  businessName: string;
  ownerEmail: string;
  area: string;
  services: ServiceDraft[];
  depositEnabled: boolean;
  depositAmount: number;
  termsText: string;
}

/** Demo-mode sample invites so the onboard screen isn't empty without Supabase. */
export function demoInvites(): Invite[] {
  const day = 86_400_000;
  const now = Date.now();
  return [
    {
      id: "demo-1",
      email: "hello@pawsandco.co.uk",
      businessName: "Paws & Co. Grooming",
      status: "sent",
      sentAt: new Date(now - 2 * day).toISOString(),
      acceptedAt: null,
      expiresAt: new Date(now + 5 * day).toISOString(),
    },
    {
      id: "demo-2",
      email: "bella@snippets.dog",
      businessName: "Snippets Dog Grooming",
      status: "accepted",
      sentAt: new Date(now - 6 * day).toISOString(),
      acceptedAt: new Date(now - 5 * day).toISOString(),
      expiresAt: new Date(now + day).toISOString(),
    },
    {
      id: "demo-3",
      email: "woof@muddypaws.uk",
      businessName: "Muddy Paws",
      status: "sent",
      sentAt: new Date(now - 10 * day).toISOString(),
      acceptedAt: null,
      expiresAt: new Date(now - 3 * day).toISOString(), // expired
    },
  ];
}
