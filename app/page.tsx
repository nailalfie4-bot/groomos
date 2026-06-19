"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  Check,
  PawPrint,
  Plus,
  Scissors,
  Search,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat } from "@/components/ui/stat";
import { Modal } from "@/components/ui/modal";

/* ------------------------------------------------------------------ */
/* Showcase scaffolding                                                */
/* ------------------------------------------------------------------ */

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-DEFAULT py-14">
      <div className="mb-8 flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-accent">
          {eyebrow}
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && (
          <p className="max-w-xl text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  name,
  value,
  className,
  border,
}: {
  name: string;
  value: string;
  className: string;
  border?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`h-16 rounded-lg ${className} ${
          border ? "border border-strong" : ""
        }`}
      />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-ink">{name}</span>
        <span className="tabular-nums text-xs text-ink-subtle">{value}</span>
      </div>
    </div>
  );
}

const typeScale = [
  { name: "Display", cls: "text-3xl font-semibold tracking-tight", px: "56" },
  { name: "Title", cls: "text-2xl font-semibold tracking-tight", px: "40" },
  { name: "Heading", cls: "text-xl font-semibold tracking-tight", px: "28" },
  { name: "Subheading", cls: "text-lg font-medium", px: "20" },
  { name: "Body", cls: "text-base", px: "16" },
  { name: "Small", cls: "text-sm text-ink-muted", px: "14" },
  { name: "Caption", cls: "text-xs text-ink-subtle", px: "12" },
];

const appointments = [
  { pet: "Biscuit", owner: "Hannah Reyes", service: "Full groom", time: "9:00", status: "Confirmed" },
  { pet: "Maple", owner: "Theo Adeyemi", service: "Bath & tidy", time: "10:30", status: "Confirmed" },
  { pet: "Juno", owner: "Priya Nair", service: "Nail clip", time: "11:15", status: "Pending" },
  { pet: "Cooper", owner: "Liam O'Shea", service: "De-shed", time: "13:00", status: "Pending" },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function FoundationsPage() {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function simulateLoad() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  }

  function confirmBooking() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setModalOpen(false);
      toast.success("Appointment booked", {
        description: "Biscuit · Full groom · Today 9:00",
      });
    }, 900);
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header ------------------------------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-DEFAULT bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {["Foundations", "Components", "Patterns"].map((item, i) => (
              <a
                key={item}
                href="#"
                className={`rounded-md px-3 py-1.5 text-sm transition-colors duration-fast ${
                  i === 0
                    ? "font-medium text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Docs
            </Button>
            <Button size="sm">
              <Sparkles className="h-4 w-4" />
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero ----------------------------------------------------- */}
        <div className="animate-fade-up py-16">
          <Badge tone="accent" className="mb-5">
            <PawPrint className="h-3.5 w-3.5" />
            Design system · v0.1
          </Badge>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink">
            The foundations behind GroomOS.
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-muted">
            One warm neutral base, a single evergreen accent, a deliberate type
            scale and soft elevation. Restrained, confident, built to scale from
            one chair to a hundred.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={() => setModalOpen(true)}>
              <CalendarPlus className="h-4 w-4" />
              Book appointment
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast("Saved to drafts", {
                  description: "You can finish this later.",
                })
              }
            >
              Trigger a toast
            </Button>
          </div>
        </div>

        {/* Colour --------------------------------------------------- */}
        <Section
          eyebrow="Colour"
          title="A neutral base and one accent"
          description="The warm stone neutral carries the interface. The evergreen accent is reserved for primary actions and focus — never decoration."
        >
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Swatch name="Canvas" value="#FAFAF8" className="bg-canvas" border />
            <Swatch name="Surface" value="#FFFFFF" className="bg-surface" border />
            <Swatch name="Ink" value="#1A1A1A" className="bg-ink" />
            <Swatch name="Ink muted" value="#6B6B66" className="bg-ink-muted" />
            <Swatch name="Accent 500" value="#1F7A4D" className="bg-accent-500" />
            <Swatch name="Accent 600" value="#19663F" className="bg-accent-600" />
            <Swatch name="Accent 50" value="#ECF6F0" className="bg-accent-50" border />
            <Swatch name="Border" value="#EAEAEA" className="bg-border" border />
          </div>
        </Section>

        {/* Typography ----------------------------------------------- */}
        <Section
          eyebrow="Typography"
          title="Inter, on a clear scale"
          description="12 / 14 / 16 / 20 / 28 / 40 / 56 with tight, deliberate line-heights. Numbers use tabular figures."
        >
          <div className="divide-y divide-border rounded-xl border border-DEFAULT bg-surface">
            {typeScale.map((row) => (
              <div
                key={row.name}
                className="flex items-baseline justify-between gap-6 px-6 py-4"
              >
                <span className={`${row.cls} truncate text-ink`}>
                  The quick brown fox
                </span>
                <span className="shrink-0 tabular-nums text-xs text-ink-subtle">
                  {row.name} · {row.px}px
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons -------------------------------------------------- */}
        <Section
          eyebrow="Components"
          title="Buttons"
          description="Solid accent for the one primary action, subtle bordered secondary, ghost tertiary. Consistent 40px height with smooth state transitions."
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Delete</Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New client
              </Button>
              <Button size="sm" variant="secondary">
                <Scissors className="h-4 w-4" />
                Services
              </Button>
            </div>
          </div>
        </Section>

        {/* Inputs & cards ------------------------------------------- */}
        <Section
          eyebrow="Components"
          title="Inputs & cards"
          description="Clean bordered inputs with an accent focus ring and inline validation. Cards are white on canvas with a hairline border and soft shadow."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New client</CardTitle>
                <CardDescription>
                  Add a pet owner to your book.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Input
                  label="Owner name"
                  placeholder="e.g. Hannah Reyes"
                  defaultValue="Hannah Reyes"
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="name@example.com"
                  leadingIcon={<Search />}
                  hint="We'll send appointment reminders here."
                />
                <Input
                  label="Phone"
                  placeholder="07…"
                  defaultValue="07!!"
                  error="Enter a valid UK mobile number."
                />
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => toast.success("Client added")}
                >
                  Add client
                </Button>
              </CardFooter>
            </Card>

            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="grid grid-cols-2 gap-6 pt-6">
                  <Stat label="Bookings today" value="18" delta="+12.5%" />
                  <Stat label="Revenue" value="£1,240" delta="+8.2%" />
                  <Stat label="No-shows" value="2" delta="-1.0%" />
                  <Stat label="Utilisation" value="86%" delta="+4.0%" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Badges</CardTitle>
                  <CardDescription>Quiet status, never loud.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge tone="accent" dot>
                    Active
                  </Badge>
                  <Badge tone="success" dot>
                    Confirmed
                  </Badge>
                  <Badge tone="warning" dot>
                    Pending
                  </Badge>
                  <Badge tone="danger" dot>
                    No-show
                  </Badge>
                  <Badge>Walk-in</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </Section>

        {/* Lists, loading & empty ----------------------------------- */}
        <Section
          eyebrow="Patterns"
          title="Lists, loading & empty"
          description="Generous row height with clear hierarchy and hover states. Skeletons cover loading — never spinners. Every empty view is designed."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">
                    Today&apos;s schedule
                  </span>
                  <span className="text-xs text-ink-subtle">
                    4 appointments
                  </span>
                </div>
                <Button size="sm" variant="secondary" onClick={simulateLoad}>
                  Reload
                </Button>
              </div>
              <div className="divide-y divide-border border-t border-DEFAULT">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-6 py-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex flex-1 flex-col gap-2">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-3.5 w-10" />
                      </div>
                    ))
                  : appointments.map((a) => (
                      <div
                        key={a.pet}
                        className="flex items-center gap-4 px-6 py-4 transition-colors duration-fast hover:bg-surface-sunken"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-50 text-accent-700">
                          <PawPrint className="h-4 w-4" />
                        </span>
                        <div className="flex flex-1 flex-col">
                          <span className="text-sm font-medium text-ink">
                            {a.pet}
                            <span className="text-ink-subtle">
                              {" "}
                              · {a.owner}
                            </span>
                          </span>
                          <span className="text-xs text-ink-muted">
                            {a.service}
                          </span>
                        </div>
                        <span className="tabular-nums text-sm text-ink-muted">
                          {a.time}
                        </span>
                        <Badge
                          tone={a.status === "Confirmed" ? "success" : "warning"}
                          dot
                        >
                          {a.status}
                        </Badge>
                      </div>
                    ))}
              </div>
            </Card>

            <Card className="flex items-center justify-center">
              <EmptyState
                icon={<Scissors />}
                title="No services yet"
                description="Add the services you offer so clients can book the right slot."
                action={
                  <Button
                    size="sm"
                    onClick={() => toast.success("Let's add a service")}
                  >
                    <Plus className="h-4 w-4" />
                    Add service
                  </Button>
                }
              />
            </Card>
          </div>
        </Section>
      </main>

      {/* Footer ----------------------------------------------------- */}
      <footer className="border-t border-DEFAULT">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo />
          <p className="text-xs text-ink-subtle">
            GroomOS design system · {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* Modal (meaningful motion) ---------------------------------- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Book appointment"
        description="Confirm the details below to add this to today's schedule."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={confirmBooking}>
              {!saving && <Check className="h-4 w-4" />}
              Confirm
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <Input label="Pet" defaultValue="Biscuit" />
          <Input label="Service" defaultValue="Full groom" />
          <Input label="Time" defaultValue="09:00" />
        </div>
      </Modal>
    </div>
  );
}
