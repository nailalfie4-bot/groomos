import type { Metadata } from "next";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";

const CONTACT = "nailalfie4@gmail.com";

export const metadata: Metadata = {
  title: "Privacy Policy · GroomOS",
  description: "How GroomOS handles your data and your clients' data — plain English, GDPR-aware.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="11 July 2026"
      intro="GroomOS is booking and client-management software for dog groomers. This policy explains, in plain English, what personal data we hold, why, where it lives, and the rights you and your clients have under UK GDPR."
    >
      <LegalSection title="Who we are">
        <p>
          GroomOS (“we”, “us”) provides the software a grooming business uses to take bookings and
          manage its clients. For your own business account you are our customer; for the dog owners
          in your account, <strong>you are the data controller</strong> and GroomOS acts as your data
          processor. Questions or requests: <a className="text-accent-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>

      <LegalSection title="What data we hold">
        <LegalList
          items={[
            <>
              <strong>Groomer accounts:</strong> your name, email, business name and settings, and a
              securely hashed password (handled by our authentication provider).
            </>,
            <>
              <strong>Client &amp; pet records:</strong> the dog owner’s name, email and phone, plus pet
              details (name, breed, size, coat and grooming notes) — entered by you or submitted through
              your public booking page.
            </>,
            <>
              <strong>Bookings:</strong> appointment dates/times, services, prices and deposit amounts.
            </>,
            <>
              <strong>Payments:</strong> we do <strong>not</strong> store card numbers. Card details are
              entered directly with Stripe, our payment processor.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          Only to provide the service: showing your calendar, taking online bookings, sending
          appointment reminders and booking confirmations by email, processing subscription payments,
          and keeping your account secure. We do not sell your data or your clients’ data, and we do not
          use it for advertising.
        </p>
      </LegalSection>

      <LegalSection title="Where your data lives & who processes it">
        <p>Your data is hosted in the EU/UK region. We share data only with the providers that run the service:</p>
        <LegalList
          items={[
            <><strong>Supabase</strong> — database and authentication hosting (EU region).</>,
            <><strong>Stripe</strong> — subscription and deposit payments (PCI-compliant; processes card data on our behalf).</>,
            <><strong>Resend</strong> — sending reminder and confirmation emails.</>,
            <><strong>Vercel</strong> — application hosting.</>,
          ]}
        />
        <p>Each is a reputable processor bound to protect the data and use it only to provide their service to us.</p>
      </LegalSection>

      <LegalSection title="Legal basis (UK GDPR)">
        <p>
          We process account data to perform our contract with you. Client and pet records are processed
          on your instructions as your processor — the lawful basis for holding your clients’ data
          (usually legitimate interest or consent) sits with you as the controller.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your data for as long as your account is active. If you close your account or ask us to
          delete data, we remove it within 30 days, except where we must keep limited records for legal or
          accounting reasons.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>Under UK GDPR you (and your clients, via you) can ask to:</p>
        <LegalList
          items={[
            "Access the personal data we hold",
            "Correct anything inaccurate",
            "Delete data (“right to be forgotten”)",
            "Export a copy of the data",
            "Object to or restrict certain processing",
          ]}
        />
        <p>
          To exercise any of these, email <a className="text-accent-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>{" "}
          and we’ll respond within one month. You can also complain to the UK Information Commissioner’s
          Office (ICO) if you’re unhappy with how we’ve handled your data.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          We use only essential cookies needed to keep you logged in. We do not use advertising or
          third-party tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about this policy or your data:{" "}
          <a className="text-accent-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
