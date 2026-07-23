"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { useStore } from "@/lib/mock/store";
import { PLANS, PLAN_ORDER, isStripeConfigured, type PlanId } from "@/lib/stripe/config";
import { cn } from "@/lib/utils";

const ACTIVE_STATUSES = ["active", "trialing", "past_due"];

export default function BillingPage() {
  const { configured } = useAuth();
  const { business } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  const realBilling = configured && isStripeConfigured();
  const currentPlan = business.plan as PlanId | undefined;
  const status = business.subscriptionStatus;
  const subscribed =
    realBilling && !!currentPlan && !!status && ACTIVE_STATUSES.includes(status);

  // Surface the result of a Checkout redirect (?checkout=success|cancelled).
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("checkout");
    if (c === "success") toast.success("Subscription active — thank you!");
    else if (c === "cancelled") toast("Checkout cancelled", { description: "No charge was made." });
    if (c) window.history.replaceState(null, "", "/billing");
  }, []);

  async function choose(plan: PlanId) {
    if (!realBilling) {
      toast("Demo only", { description: "Payments aren't wired up in this demo." });
      return;
    }
    setBusy(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.error === "price_not_configured") {
        // Name the plan so it's obvious *which* one is unconfigured — the others
        // still work. The founder can confirm the exact env var at /api/stripe/status.
        toast.error(`${PLANS[plan].name} isn't available for checkout yet.`, {
          description: "This plan's price isn't set up in Stripe. The other plans still work.",
        });
        return;
      }
      if (data.error === "billing_not_configured") {
        toast.error("Payments aren't set up on this account yet.");
        return;
      }
      toast.error(
        data.message || "Couldn't start checkout — please try again.",
        data.message ? { description: [data.type, data.code].filter(Boolean).join(" · ") || undefined } : undefined,
      );
    } catch {
      toast.error("Couldn't reach billing — please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error("Couldn't open billing management — please try again.");
    } catch {
      toast.error("Couldn't reach billing — please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Plans & billing"
        subtitle="Simple monthly pricing. Cancel anytime."
        actions={
          subscribed ? (
            <Button size="sm" variant="secondary" loading={busy === "portal"} onClick={openPortal}>
              <CreditCard className="h-4 w-4" />
              Manage billing
            </Button>
          ) : undefined
        }
      />

      {subscribed && status === "past_due" && (
        <div className="mb-5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          Your last payment didn&apos;t go through. Update your card via{" "}
          <button onClick={openPortal} className="font-semibold underline">
            Manage billing
          </button>{" "}
          to keep your account active.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const current = subscribed && currentPlan === id;
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-surface p-6 shadow-card",
                plan.highlighted ? "border-accent shadow-md ring-1 ring-accent/20" : "border-DEFAULT",
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-6">
                  <Badge tone="accent">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most popular
                  </Badge>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold tracking-tight text-ink">{plan.name}</h3>
                {current && <Badge tone="success">Current</Badge>}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="tabular-nums text-3xl font-semibold tracking-tight text-ink">
                  £{plan.priceGBP}
                </span>
                <span className="text-sm text-ink-muted">/ month</span>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  disabled={current}
                  loading={busy === id}
                  onClick={() => (subscribed ? openPortal() : choose(id))}
                >
                  {current ? "Current plan" : subscribed ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {!realBilling && (
        <p className="mt-6 text-center text-xs text-ink-subtle">
          This is a visual demo — no real payment is taken and no card details are collected.
        </p>
      )}
    </>
  );
}
