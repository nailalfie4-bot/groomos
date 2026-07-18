/**
 * Public deposit payment page: /pay/<token>.
 *
 * Server component — resolves the deposit link with the service-role client
 * (no anonymous RLS) and hands a serialisable view to the interactive payment
 * component. Every state (payable, paid, expired, unknown) is rendered client
 * side so the page is a single, simple mobile experience.
 */
import type { Metadata } from "next";
import { resolveDepositLinkPublic } from "@/lib/data/deposit-links";
import { DepositLinkPay, type DepositLinkClientView } from "@/components/deposit-link-pay";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pay your deposit · GroomOS",
  robots: { index: false, follow: false },
};

export default async function DepositLinkPage({ params }: { params: { token: string } }) {
  const link = await resolveDepositLinkPublic(params.token).catch(() => null);
  const view: DepositLinkClientView = link ?? {
    found: false,
    paid: false,
    expired: false,
    amount: 0,
    businessName: "Your groomer",
    petName: "your dog",
    serviceName: "Groom",
    whenISO: new Date().toISOString(),
    chargeReady: false,
  };
  return <DepositLinkPay token={params.token} link={view} />;
}
