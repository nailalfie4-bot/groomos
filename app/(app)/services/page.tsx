"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { Modal } from "@/components/ui/modal";
import { useServices } from "@/lib/data/use-services";
import type { NewServiceInput } from "@/lib/mock/store";
import type { Service } from "@/lib/types";
import { formatGBP } from "@/lib/format";

export default function ServicesPage() {
  const { services, loading, bookedCountFor, addService, updateService, deleteService } =
    useServices();
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
                  <ServiceCard key={s.id} s={s} booked={bookedCountFor(s.id)} onEdit={() => setEditing(s)} onDelete={() => setConfirmDelete(s)} />
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
  onEdit,
  onDelete,
  addon = false,
}: {
  s: Service;
  booked: number;
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
    </div>
  );
}

function ServiceEditor({
  open,
  service,
  isAddon,
  onClose,
  onSave,
}: {
  open: boolean;
  service: Service | null;
  isAddon: boolean;
  onClose: () => void;
  onSave: (input: NewServiceInput) => void;
}) {
  return open ? (
    <ServiceEditorInner
      key={service?.id ?? (isAddon ? "new-addon" : "new")}
      service={service}
      isAddon={isAddon}
      onClose={onClose}
      onSave={onSave}
    />
  ) : null;
}

function ServiceEditorInner({
  service,
  isAddon,
  onClose,
  onSave,
}: {
  service: Service | null;
  isAddon: boolean;
  onClose: () => void;
  onSave: (input: NewServiceInput) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(String(service?.durationMin ?? (isAddon ? 0 : 60)));
  const [price, setPrice] = useState(String(service?.priceGBP ?? (isAddon ? 10 : 30)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Required";
    const dur = Number(duration);
    const pr = Number(price);
    // Add-ons may add 0 extra time; main services need a real duration.
    if (!Number.isFinite(dur) || dur < 0 || (!isAddon && dur <= 0)) next.duration = isAddon ? "0 or more" : "Must be > 0";
    if (!Number.isFinite(pr) || pr < 0) next.price = "Invalid price";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      durationMin: Math.round(dur),
      priceGBP: Math.round(pr * 100) / 100,
      isAddon,
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
      </div>
    </Modal>
  );
}
