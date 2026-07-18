"use client";

/**
 * Deposit link payment page — the simple mobile page a phone-booked client
 * opens from the text/email their groomer sent. Shows the appointment summary
 * and a card form; paying charges the deposit straight into the groomer's
 * connected Stripe account and marks the appointment's deposit paid.
 *
 * Every terminal state is handled: already paid, link expired, payments
 * unavailable, and the happy path (pay → confirmed).
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Clock, Loader2, Lock, MapPin, PawPrint } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatGBP } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DepositLinkClientView = {
  found: boolean;
  paid: boolean;
  expired: boolean;
  amount: number;
  businessName: string;
  petName: string;
  serviceName: string;
  whenISO: string;
  address?: string;
  connectedAccountId?: string;
  publishableKey?: string;
  chargeReady: boolean;
};

const EASE = [0.22, 1, 0.36, 1] as const;

const STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#C9756B",
    borderRadius: "12px",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  },
};

function whenLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

export function DepositLinkPay({ token, link }: { token: string; link: DepositLinkClientView }) {
  // `paid` starts from the server view but flips to true after a live payment.
  const [paid, setPaid] = useState(link.paid);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-DEFAULT bg-surface">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          <Logo />
          <Badge tone="neutral">Deposit</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-8">
        {/* Who they're paying — shown for trust whenever we know the business. */}
        {link.found && (
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
              <PawPrint className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight text-ink">{link.businessName}</p>
              {link.address && <p className="mt-0.5 text-sm text-ink-muted">{link.address}</p>}
            </div>
          </div>
        )}

        {!link.found ? (
          <Notice
            title="Link not found"
            body="This deposit link isn't valid. Please check the message from your groomer, or get in touch with them directly."
          />
        ) : paid ? (
          <PaidCard link={link} />
        ) : link.expired ? (
          <Notice
            title="This link has expired"
            body={`This deposit link was only valid until ${link.petName}'s appointment time. Please contact ${link.businessName} to sort your deposit.`}
          />
        ) : !link.chargeReady ? (
          <Notice
            title="Payments unavailable"
            body={`${link.businessName} can't take card payments right now. Please contact them directly to secure the slot.`}
          />
        ) : (
          <>
            <Summary link={link} />
            <div className="mt-5">
              <PayBox token={token} link={link} onPaid={() => setPaid(true)} />
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto max-w-md px-5 pb-8 pt-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-ink-subtle">
          <span>Powered by GroomOS</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3 w-3" /> Payments powered by Stripe
          </span>
        </div>
      </footer>
    </div>
  );
}

function Summary({ link }: { link: DepositLinkClientView }) {
  return (
    <div className="rounded-2xl border border-DEFAULT bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2.5 text-sm font-medium text-ink">
        <CalendarClock className="h-4 w-4 text-accent" />
        {whenLabel(link.whenISO)}
      </div>
      <dl className="mt-4 flex flex-col gap-2">
        <Row label="Groom" value={link.serviceName} />
        <Row label="Dog" value={link.petName} />
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-DEFAULT pt-4">
        <span className="text-sm font-medium text-ink">Deposit due</span>
        <span className="text-xl font-semibold text-ink">{formatGBP(link.amount)}</span>
      </div>
      <p className="mt-1.5 text-xs text-ink-subtle">
        Secures your slot and comes off your total — you&apos;ll pay the rest to {link.businessName} on the day.
      </p>
    </div>
  );
}

function PaidCard({ link }: { link: DepositLinkClientView }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: EASE }}>
      <div className="rounded-2xl border border-DEFAULT bg-surface p-6 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-deep">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Deposit paid</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Thank you! Your {formatGBP(link.amount)} deposit for {link.petName}&apos;s groom is paid and your
          slot with {link.businessName} is secured. See you on {whenLabel(link.whenISO)}.
        </p>
      </div>
    </motion.div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-DEFAULT bg-surface p-6 text-center shadow-card">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
        <Clock className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

/** Loads the PaymentIntent (by token) then mounts the card element. */
function PayBox({
  token,
  link,
  onPaid,
}: {
  token: string;
  link: DepositLinkClientView;
  onPaid: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo(
    () =>
      link.publishableKey
        ? loadStripe(link.publishableKey, { stripeAccount: link.connectedAccountId })
        : null,
    [link.publishableKey, link.connectedAccountId],
  );

  useEffect(() => {
    let active = true;
    setClientSecret(null);
    setError(null);
    fetch("/api/pay/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d?.ok && d.clientSecret) setClientSecret(d.clientSecret as string);
        else if (d?.error === "already_paid") setError("This deposit has already been paid.");
        else if (d?.error === "expired") setError("This link has expired — please contact your groomer.");
        else setError("We couldn't start the payment — please try again in a moment.");
      })
      .catch(() => {
        if (active) setError("We couldn't reach the payment service — please try again.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
        {error}
      </div>
    );
  }
  if (!clientSecret || !stripePromise) {
    return (
      <div className="flex h-24 items-center justify-center rounded-2xl border border-DEFAULT bg-surface text-ink-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
      <PayForm token={token} amount={link.amount} onPaid={onPaid} />
    </Elements>
  );
}

function PayForm({
  token,
  amount,
  onPaid,
}: {
  token: string;
  amount: number;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (err) {
      setError(err.message ?? "Your payment couldn't be completed — please try again.");
      setPaying(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Record it server-side before showing success (re-verified there).
      const res = await fetch("/api/pay/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, paymentIntentId: paymentIntent.id }),
      })
        .then((r) => r.json())
        .catch(() => null);
      if (res?.ok) {
        onPaid();
        return;
      }
      setError("Your payment went through but we couldn't confirm it — please contact your groomer.");
      setPaying(false);
      return;
    }
    setError("Your payment didn't complete — please try again.");
    setPaying(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-DEFAULT bg-surface p-4">
        <PaymentElement onReady={() => setReady(true)} options={{ layout: "tabs" }} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        size="lg"
        className={cn("h-12 w-full")}
        onClick={pay}
        loading={paying}
        disabled={paying || !stripe || !ready}
      >
        <Lock className="h-4 w-4" />
        Pay {formatGBP(amount)} deposit
      </Button>
      <p className="-mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-ink-subtle">
        <Lock className="h-3 w-3" /> Secured by Stripe · your deposit goes straight to the groomer.
      </p>
    </div>
  );
}
