"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { NewServiceInput } from "@/lib/mock/store";
import type { Service } from "@/lib/types";
import { formatGBP } from "@/lib/format";

export default function ServicesPage() {
  const loading = useDemoLoad();
  const { services, appointments, addService, updateService, deleteService } = useStore();
  const [editing, setEditing] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="What you offer, how long it takes, and what it costs"
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
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
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Add service
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <div key={s.id} className="flex flex-col rounded-2xl border border-DEFAULT bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold tracking-tight text-ink">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">{s.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditing(s)}
                    aria-label="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(s)}
                    aria-label="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 border-t border-DEFAULT pt-3 text-sm">
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Clock className="h-4 w-4" />
                  {s.durationMin} min
                </span>
                <span className="tabular-nums font-semibold text-ink">
                  {formatGBP(s.priceGBP)}
                </span>
                <span className="ml-auto text-xs text-ink-subtle">
                  {appointments.filter((a) => a.serviceId === s.id && a.status !== "cancelled").length} booked
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <ServiceEditor
        open={creating || editing !== null}
        service={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(input) => {
          if (editing) {
            updateService(editing.id, input);
            toast.success("Service updated");
          } else {
            addService(input);
            toast.success("Service added");
          }
          setCreating(false);
          setEditing(null);
        }}
      />

      {/* Delete confirm */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete service?"
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
              onClick={() => {
                if (confirmDelete) {
                  deleteService(confirmDelete.id);
                  toast.success(`"${confirmDelete.name}" deleted`);
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

function ServiceEditor({
  open,
  service,
  onClose,
  onSave,
}: {
  open: boolean;
  service: Service | null;
  onClose: () => void;
  onSave: (input: NewServiceInput) => void;
}) {
  // Re-key the form to the service being edited so fields reset correctly.
  return open ? (
    <ServiceEditorInner
      key={service?.id ?? "new"}
      service={service}
      onClose={onClose}
      onSave={onSave}
    />
  ) : null;
}

function ServiceEditorInner({
  service,
  onClose,
  onSave,
}: {
  service: Service | null;
  onClose: () => void;
  onSave: (input: NewServiceInput) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(String(service?.durationMin ?? 60));
  const [price, setPrice] = useState(String(service?.priceGBP ?? 30));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Required";
    const dur = Number(duration);
    const pr = Number(price);
    if (!Number.isFinite(dur) || dur <= 0) next.duration = "Must be > 0";
    if (!Number.isFinite(pr) || pr < 0) next.price = "Invalid price";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      name: name.trim(),
      description: description.trim(),
      durationMin: Math.round(dur),
      priceGBP: Math.round(pr * 100) / 100,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={service ? "Edit service" : "Add service"}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            {service ? "Save changes" : "Add service"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <Input
          label="Name"
          placeholder="e.g. Full Groom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Textarea
          label="Description"
          placeholder="What's included…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duration (min)"
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            error={errors.duration}
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
