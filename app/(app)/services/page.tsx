"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Clock, Pencil, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { Modal } from "@/components/ui/modal";
import { useServices } from "@/lib/data/use-services";
import { useStore, type NewServiceInput } from "@/lib/mock/store";
import type { Service, ServiceDepositType, Settings } from "@/lib/types";
import { resolveServiceDeposit, isBookableAlone } from "@/lib/pricing";
import { formatGBP } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The deposit modes a service can be set to, in display order. */
const DEPOSIT_OPTIONS: { id: ServiceDepositType; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "none", label: "None" },
  { id: "fixed", label: "Fixed £" },
  { id: "percent", label: "% of price" },
];

/** Short human label for a service's deposit rule + the amount it resolves to. */
function depositSummary(s: Service, settings: Settings): string {
  const amount = resolveServiceDeposit(s, settings);
  const type = s.depositType ?? "default";
  if (type === "none" || amount <= 0) return "No deposit";
  if (type === "percent") return `${s.depositValue ?? 0}% deposit · ${formatGBP(amount)}`;
  if (type === "fixed") return `${formatGBP(amount)} deposit`;
  return `Default deposit · ${formatGBP(amount)}`;
}

export default function ServicesPage() {
  const { services, loading, bookedCountFor, addService, updateService, deleteService } =
    useServices();
  const { settings } = useStore();
  const [editing, setEditing] = useState<Service | null>(null);
  const [creatingKind, setCreatingKind] = useState<null | "service" | "addon">(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  const mainServices = services.filter((s) => !s.isAddon);
  const addOns = services.filter((s) => s.isAddon);
  const editorIsAddon = editing ? Boolean(editing.isAddon) : creatingKind === "addon";

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="What you offer, how long it takes, and what it costs"
        actions={
          <Button size="sm" onClick={() => setCreatingKind("service")}>
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <EmptyState
            art={<DogEmpty />}
            title="No services yet"
            description="Add the services you offer so clients can book the right groom."
            action={
              <Button size="sm" onClick={() => setCreatingKind("service")}>
                <Plus className="h-4 w-4" />
                Add service
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Main services */}
          <section>
            {mainServices.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {mainServices.map((s) => (
                  <ServiceCard key={s.id} s={s} booked={bookedCountFor(s.id)} settings={settings} onEdit={() => setEditing(s)} onDelete={() => setConfirmDelete(s)} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-strong bg-surface-sunken p-4 text-sm text-ink-muted">
                No main services yet — add one above.
              </p>
            )}
          </section>

          {/* Add-ons */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Sparkles className="h-4 w-4 text-accent" /> Add-ons
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Extras clients can add to any groom — teeth clean, nail trim, de-shed…
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setCreatingKind("addon")}>
                <Plus className="h-4 w-4" />
                Add-on
              </Button>
            </div>
            {addOns.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {addOns.map((s) => (
                  <ServiceCard key={s.id} s={s} booked={bookedCountFor(s.id)} onEdit={() => setEditing(s)} onDelete={() => setConfirmDelete(s)} addon />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-strong bg-surface-sunken p-4 text-sm text-ink-muted">
                No add-ons yet. Add one to let clients boost their booking (and your average sale).
              </p>
            )}
          </section>
        </div>
      )}

      {/* Create / edit */}
      <ServiceEditor
        open={creatingKind !== null || editing !== null}
        service={editing}
        isAddon={editorIsAddon}
        settings={settings}
        onClose={() => {
          setCreatingKind(null);
          setEditing(null);
        }}
        onSave={async (input) => {
          try {
            if (editing) {
              await updateService(editing.id, input);
              toast.success(input.isAddon ? "Add-on updated" : "Service updated");
            } else {
              await addService(input);
              toast.success(input.isAddon ? "Add-on added" : "Service added");
            }
            setCreatingKind(null);
            setEditing(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't save");
          }
        }}
      />

      {/* Delete confirm */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.isAddon ? "Delete add-on?" : "Delete service?"}
        description={
          confirmDelete
            ? `"${confirmDelete.name}" will be removed. Existing appointments keep their recorded price.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (!confirmDelete) return;
                const name = confirmDelete.name;
                try {
                  await deleteService(confirmDelete.id);
                  toast.success(`"${name}" deleted`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't delete");
                }
                setConfirmDelete(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}

function ServiceCard({
  s,
  booked,
  settings,
  onEdit,
  onDelete,
  addon = false,
}: {
  s: Service;
  booked: number;
  settings?: Settings;
  onEdit: () => void;
  onDelete: () => void;
  addon?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-DEFAULT bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-ink">{s.name}</h3>
          {s.description && <p className="mt-1 text-sm text-ink-muted">{s.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onEdit} aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-ink">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-DEFAULT pt-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <Clock className="h-4 w-4" />
          {addon ? (s.durationMin > 0 ? `+${s.durationMin} min` : "no extra time") : `${s.durationMin} min`}
        </span>
        <span className="tabular-nums font-semibold text-ink">{formatGBP(s.priceGBP)}</span>
        <span className="ml-auto text-xs text-ink-subtle">{booked} booked</span>
      </div>
      {!addon && settings && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-subtle">
          <ShieldCheck className="h-3.5 w-3.5 text-accent/80" />
          {depositSummary(s, settings)}
        </p>
      )}
      {addon && isBookableAlone(s) && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-subtle">
          <CalendarCheck className="h-3.5 w-3.5 text-accent/80" />
          Also bookable on its own
        </p>
      )}
    </div>
  );
}

function ServiceEditor({
  open,
  service,
  isAddon,
  settings,
  onClose,
  onSave,
}: {
  open: boolean;
  service: Service | null;
  isAddon: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (input: NewServiceInput) => void;
}) {
  return open ? (
    <ServiceEditorInner
      key={service?.id ?? (isAddon ? "new-addon" : "new")}
      service={service}
      isAddon={isAddon}
      settings={settings}
      onClose={onClose}
      onSave={onSave}
    />
  ) : null;
}

function ServiceEditorInner({
  service,
  isAddon,
  settings,
  onClose,
  onSave,
}: {
  service: Service | null;
  isAddon: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (input: NewServiceInput) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(String(service?.durationMin ?? (isAddon ? 0 : 60)));
  const [price, setPrice] = useState(String(service?.priceGBP ?? (isAddon ? 10 : 30)));
  // Default: main services book alone; add-ons don't — until the groomer opts in.
  const [bookableAlone, setBookableAlone] = useState(service?.bookableAlone ?? !isAddon);
  const [depositType, setDepositType] = useState<ServiceDepositType>(service?.depositType ?? "default");
  const [depositValue, setDepositValue] = useState(
    service?.depositValue != null ? String(service.depositValue) : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // A deposit is relevant for anything a client can book on its own.
  const showDeposit = bookableAlone;
  const usesValue = depositType === "fixed" || depositType === "percent";
  const previewAmount = resolveServiceDeposit(
    { depositType, depositValue: Number(depositValue) || 0, priceGBP: Number(price) || 0 },
    settings,
  );
  const depositPreview =
    depositType === "default"
      ? settings.depositEnabled && settings.depositAmount > 0
        ? `Uses your business default — ${formatGBP(settings.depositAmount)} right now.`
        : "Uses your business default — currently no deposit."
      : depositType === "none"
        ? "Clients book this service with no deposit."
        : previewAmount > 0
          ? `Clients pay a ${formatGBP(previewAmount)} deposit to book.`
          : "Enter an amount above.";

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Required";
    const dur = Number(duration);
    const pr = Number(price);
    // An add-on used only as an extra may add 0 time; anything bookable on its
    // own needs a real duration to occupy a slot.
    const needsDuration = !isAddon || bookableAlone;
    if (!Number.isFinite(dur) || dur < 0 || (needsDuration && dur <= 0))
      next.duration = needsDuration ? "Must be > 0" : "0 or more";
    if (!Number.isFinite(pr) || pr < 0) next.price = "Invalid price";
    if (showDeposit && usesValue) {
      const dv = Number(depositValue);
      if (!Number.isFinite(dv) || dv <= 0) next.deposit = "Enter an amount";
      else if (depositType === "percent" && dv > 100) next.deposit = "Max 100%";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      durationMin: Math.round(dur),
      priceGBP: Math.round(pr * 100) / 100,
      isAddon,
      bookableAlone,
      ...(showDeposit
        ? {
            depositType,
            depositValue: usesValue ? Math.round(Number(depositValue) * 100) / 100 : undefined,
          }
        : {}),
    });
  }

  const noun = isAddon ? "add-on" : "service";
  return (
    <Modal
      open
      onClose={onClose}
      title={service ? `Edit ${noun}` : `Add ${noun}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            {service ? "Save changes" : `Add ${noun}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <Input
          label="Name"
          placeholder={isAddon ? "e.g. Teeth cleaning" : "e.g. Full Groom"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Textarea
          label={isAddon ? "Description (optional)" : "Description"}
          placeholder="What's included…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={isAddon ? "Extra time (min)" : "Duration (min)"}
            type="number"
            min={0}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            error={errors.duration}
            hint={isAddon ? "Added to the groom" : undefined}
          />
          <Input
            label="Price (£)"
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            error={errors.price}
          />
        </div>

        <div className="rounded-xl border border-DEFAULT p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <CalendarCheck className="h-4 w-4 text-accent" />
              Bookable on its own
            </span>
            <Toggle checked={bookableAlone} onChange={setBookableAlone} label="Bookable on its own" />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {bookableAlone
              ? "Clients can book this by itself on your online booking page."
              : isAddon
                ? "Only offered as an add-on to another groom."
                : "Won't show on your online booking page."}
          </p>
        </div>

        {showDeposit && (
          <div className="rounded-xl border border-DEFAULT p-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Deposit for this service
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DEPOSIT_OPTIONS.map((o) => {
                const active = depositType === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDepositType(o.id)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors duration-fast",
                      active
                        ? "border-accent bg-accent-50 text-accent-700"
                        : "border-strong bg-surface text-ink-muted hover:border-accent hover:text-accent-700",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {usesValue && (
              <div className="mt-3">
                <Input
                  label={depositType === "fixed" ? "Amount (£)" : "Percentage (%)"}
                  type="number"
                  min={0}
                  step={depositType === "fixed" ? 1 : 5}
                  value={depositValue}
                  onChange={(e) => setDepositValue(e.target.value)}
                  error={errors.deposit}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-ink-muted">{depositPreview}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
