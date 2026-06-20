"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Check, Clock, Heart, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/mock/store";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const { settings, business, updateSettings } = useStore();
  const [form, setForm] = useState<Settings>(settings);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function num(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function save() {
    updateSettings(form);
    toast.success("Settings saved");
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="A few choices, then you're done — change them any time"
        actions={
          <Button size="sm" onClick={save}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Reminders — selling point */}
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Reminders</CardTitle>
              <CardDescription>
                Friendly text and email reminders before every appointment.
              </CardDescription>
            </div>
            <Badge tone="success" dot>
              On & included
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 rounded-xl bg-accent-50 p-4">
              <Bell className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium text-accent-700">
                  Reminders are included — and never metered.
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Send as many as you like. No per-message fees, no surprise bills
                  at the end of the month. It&apos;s all part of your plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cleanup buffer */}
        <Card>
          <CardHeader>
            <CardTitle>Cleanup time</CardTitle>
            <CardDescription>
              We add this automatically after every dog so you&apos;re never rushed
              and can never be double-booked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Input
                label="Minutes between dogs"
                type="number"
                min={0}
                step={5}
                value={String(form.bufferMin)}
                onChange={(e) => set("bufferMin", num(e.target.value))}
                leadingIcon={<Clock />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Matting meter */}
        <Card>
          <CardHeader>
            <CardTitle>Matting meter</CardTitle>
            <CardDescription>
              Fair, automatic surcharges for tricky coats and big dogs — added to
              the price and the time set aside, and explained kindly to owners.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Row
              icon={<Heart className="h-4 w-4 text-accent" />}
              title="A bit tangled"
              fee={form.tangledFee}
              mins={form.tangledExtraMin}
              onFee={(v) => set("tangledFee", v)}
              onMins={(v) => set("tangledExtraMin", v)}
            />
            <Row
              icon={<Heart className="h-4 w-4 text-accent" />}
              title="Matted / pelted"
              fee={form.mattedFee}
              mins={form.mattedExtraMin}
              onFee={(v) => set("mattedFee", v)}
              onMins={(v) => set("mattedExtraMin", v)}
            />
            <Row
              icon={<Heart className="h-4 w-4 text-accent" />}
              title="Giant breed"
              fee={form.giantFee}
              mins={form.giantExtraMin}
              onFee={(v) => set("giantFee", v)}
              onMins={(v) => set("giantExtraMin", v)}
            />
          </CardContent>
        </Card>

        {/* Rebooking */}
        <Card>
          <CardHeader>
            <CardTitle>Rebooking</CardTitle>
            <CardDescription>
              We&apos;ll flag dogs as &ldquo;due&rdquo; once it&apos;s been this long since
              their last groom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Input
                label="Default weeks between grooms"
                type="number"
                min={1}
                step={1}
                value={String(form.defaultRebookWeeks)}
                onChange={(e) => set("defaultRebookWeeks", num(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business (read-only summary) */}
        <Card>
          <CardHeader>
            <CardTitle>Your business</CardTitle>
            <CardDescription>{business.name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
            <div>
              <p className="text-ink">Opening hours</p>
              <p className="tabular-nums">
                {String(business.openHour).padStart(2, "0")}:00 –{" "}
                {String(business.closeHour).padStart(2, "0")}:00
              </p>
            </div>
            <div>
              <p className="text-ink">Where</p>
              <p>
                {business.addressLine}, {business.city} · {business.postcode}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pb-4">
          <Button onClick={save}>
            <Check className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

function Row({
  icon,
  title,
  fee,
  mins,
  onFee,
  onMins,
}: {
  icon: React.ReactNode;
  title: string;
  fee: number;
  mins: number;
  onFee: (v: number) => void;
  onMins: (v: number) => void;
}) {
  const num = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-DEFAULT bg-surface-sunken p-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 items-center gap-2 pb-2 sm:pb-0">
        {icon}
        <span className="text-sm font-medium text-ink">{title}</span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        <Input
          label="Extra charge (£)"
          type="number"
          min={0}
          step={1}
          value={String(fee)}
          onChange={(e) => onFee(num(e.target.value))}
        />
        <Input
          label="Extra time (min)"
          type="number"
          min={0}
          step={5}
          value={String(mins)}
          onChange={(e) => onMins(num(e.target.value))}
        />
      </div>
    </div>
  );
}
