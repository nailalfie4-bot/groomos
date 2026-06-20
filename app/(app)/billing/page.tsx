"use client";

import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  priceGBP: number;
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    priceGBP: 19,
    tagline: "For a single groomer finding their feet.",
    features: [
      "1 staff member",
      "Unlimited clients & pets",
      "Calendar & bookings",
      "Public booking page",
      "Email reminders",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceGBP: 29,
    tagline: "For a growing salon that needs to stay organised.",
    features: [
      "Up to 5 staff",
      "Everything in Solo",
      "SMS reminders",
      "No-show tracking & reports",
      "Service & pricing manager",
    ],
    highlighted: true,
  },
  {
    id: "salon",
    name: "Salon",
    priceGBP: 49,
    tagline: "For multi-chair salons running at full capacity.",
    features: [
      "Unlimited staff",
      "Everything in Pro",
      "Multiple locations",
      "Advanced analytics",
      "Priority support",
    ],
  },
];

const CURRENT_PLAN = "pro";

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Plans & billing"
        subtitle="Simple monthly pricing. Cancel anytime."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plan.id === CURRENT_PLAN;
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col p-6",
                plan.highlighted && "border-accent shadow-md ring-1 ring-accent/20",
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
                <h3 className="text-base font-semibold tracking-tight text-ink">
                  {plan.name}
                </h3>
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
                  onClick={() =>
                    toast("Demo only", {
                      description: "Payments aren't wired up in this demo.",
                    })
                  }
                >
                  {current ? "Current plan" : `Choose ${plan.name}`}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-ink-subtle">
        This is a visual demo — no real payment is taken and no card details are
        collected.
      </p>
    </>
  );
}
