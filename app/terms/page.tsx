import type { Metadata } from "next";
import { LegalPage, LegalSection, LegalList } from "@/components/legal-page";

const CONTACT = "nailalfie4@gmail.com";

export const metadata: Metadata = {
  title: "Terms of Service · GroomOS",
  description: "The plain-English terms for using GroomOS.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="11 July 2026"
      intro="These plain-English terms cover using GroomOS. By creating an account you agree to them."
    >
      <LegalSection title="The service">
        <p>
          GroomOS is booking and client-management software for grooming businesses: an online booking
          page, a calendar, client and pet records, deposits, and reminders. We provide the tools; how you
          run your grooming business and treat your clients is up to you.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalList
          items={[
            "You’re responsible for keeping your login details safe and for activity on your account.",
            "You must have the right to hold and use the client and pet data you enter, and you are the data controller for it (see our Privacy Policy).",
            "You must be a business (or acting on behalf of one) and at least 18.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Free trial & billing">
        <LegalList
          items={[
            "New accounts start with a 30-day free trial — no card required.",
            "After that, plans are billed monthly through Stripe. Prices are shown on our pricing page.",
            "You can cancel any time; your plan runs until the end of the paid period and does not auto-renew after cancellation.",
            "Deposits your clients pay are between you and your client; GroomOS facilitates them but is not a party to that transaction.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>Please don’t use GroomOS to break the law, send spam, upload harmful content, or attempt to disrupt or reverse-engineer the service. We may suspend accounts that do.</p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          We work hard to keep GroomOS running, but the service is provided “as is” and we can’t promise it
          will never be unavailable. We’ll give reasonable notice of planned downtime where we can.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          To the extent the law allows, GroomOS isn’t liable for indirect or consequential losses (for
          example lost profit or lost bookings), and our total liability is limited to the fees you paid us
          in the previous 12 months. Nothing here limits liability that can’t be limited by law.
        </p>
      </LegalSection>

      <LegalSection title="Ending your account">
        <p>
          You can close your account at any time. We may suspend or close accounts that breach these terms.
          On closure we delete your data as described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>We may update these terms as the product grows. If we make a material change we’ll let you know, and continued use means you accept the update.</p>
      </LegalSection>

      <LegalSection title="Governing law & contact">
        <p>
          These terms are governed by the laws of England &amp; Wales. Questions:{" "}
          <a className="text-accent-700 underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
