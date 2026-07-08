"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarPlus,
  Clock,
  Heart,
  Mail,
  PawPrint,
  Phone,
  PlusCircle,
  Save,
  Scissors,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { PetAvatar } from "@/components/pet-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";
import { BookingForm } from "@/components/booking-form";
import { useClientsData } from "@/lib/data/use-clients-data";
import type {
  CoatCondition,
  DogSize,
  GroomingHistoryEntry,
  Pet,
} from "@/lib/types";
import { formatDate, formatGBP, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const COAT_CHIP: Record<CoatCondition, { label: string; cls: string }> = {
  smooth: { label: "Smooth coat", cls: "bg-success-soft text-success-deep" },
  tangled: { label: "Tangle-prone", cls: "bg-warning-soft text-warning-deep" },
  matted: { label: "Mats easily", cls: "bg-danger-soft text-danger-deep" },
};

function ageLabel(dob?: string): string | null {
  if (!dob) return null;
  const years = Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000),
  );
  return years <= 0 ? "Under 1 yr" : `${years} yr${years === 1 ? "" : "s"}`;
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    getClient,
    getPetsForClient,
    addPet,
    getHistoryForPet,
    getLastGroomedAt,
    updatePetNotes,
    settings,
    loading,
  } = useClientsData();
  const [addingPet, setAddingPet] = useState(false);
  const [bookPetId, setBookPetId] = useState<string | null>(null);

  const client = getClient(params.id);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <ErrorState
          title="Client not found"
          description="This client may have been removed or the link is wrong."
          action={
            <Link href="/clients">
              <Button size="sm" variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Back to clients
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const pets = getPetsForClient(client.id);

  return (
    <>
      <Link
        href="/clients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar
            initials={initials(client.firstName, client.lastName)}
            className="h-12 w-12 text-sm"
          />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              {client.firstName} {client.lastName}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 hover:text-ink">
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </a>
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1 hover:text-ink">
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </a>
            </div>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setAddingPet(true)}>
          <PlusCircle className="h-4 w-4" />
          Add pet
        </Button>
      </div>

      {pets.length === 0 ? (
        <Card>
          <EmptyState
            art={<DogEmpty />}
            title="No pets on file"
            description="Add this client's dog to start booking grooming appointments."
            action={
              <Button size="sm" onClick={() => setAddingPet(true)}>
                <PlusCircle className="h-4 w-4" />
                Add pet
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {pets.map((pet) => (
            <PetProfile
              key={pet.id}
              pet={pet}
              onBook={() => setBookPetId(pet.id)}
              history={getHistoryForPet(pet.id)}
              lastGroomed={getLastGroomedAt(pet.id)}
              updatePetNotes={updatePetNotes}
              defaultRebookWeeks={settings.defaultRebookWeeks}
            />
          ))}
        </div>
      )}

      <AddPetModal
        open={addingPet}
        onClose={() => setAddingPet(false)}
        onAdd={async (draft) => {
          try {
            await addPet({ ...draft, clientId: client.id });
            toast.success(`${draft.name} added`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't add pet");
          }
        }}
      />
      <BookingForm
        open={bookPetId !== null}
        onClose={() => setBookPetId(null)}
        defaultClientId={client.id}
        defaultPetId={bookPetId ?? undefined}
      />
    </>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        className ?? "bg-surface-sunken text-ink-muted",
      )}
    >
      {children}
    </span>
  );
}

function PetProfile({
  pet,
  onBook,
  history,
  lastGroomed,
  updatePetNotes,
  defaultRebookWeeks,
}: {
  pet: Pet;
  onBook: () => void;
  history: GroomingHistoryEntry[];
  lastGroomed: string | undefined;
  updatePetNotes: (petId: string, notes: string) => Promise<void>;
  defaultRebookWeeks: number;
}) {
  const [notes, setNotes] = useState(pet.notes);
  const dirty = notes !== pet.notes;

  const latestCoat = history[0]?.appointment.coatCondition ?? "smooth";
  const weeksSince = lastGroomed
    ? Math.floor((Date.now() - new Date(lastGroomed).getTime()) / (7 * 24 * 3600 * 1000))
    : null;
  const overdue = weeksSince !== null && weeksSince >= defaultRebookWeeks;
  const age = ageLabel(pet.dateOfBirth);
  const completedCount = history.filter((h) => h.appointment.status === "completed").length;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-3">
          <PetAvatar petId={pet.id} name={pet.name} className="h-11 w-11" />
          <div>
            <h2 className="text-base font-semibold tracking-tight text-ink">{pet.name}</h2>
            <p className="text-xs text-ink-muted">
              {pet.breed} · <span className="capitalize">{pet.size}</span>
              {age && <> · {age}</>}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onBook}>
          <CalendarPlus className="h-4 w-4" />
          Book
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 pt-0">
        {/* Context chips — everything you need before the dog arrives */}
        <div className="flex flex-wrap gap-2">
          {pet.coatType && (
            <Chip>
              <Scissors className="h-3 w-3" /> {pet.coatType} coat
            </Chip>
          )}
          {pet.temperament && (
            <Chip>
              <Heart className="h-3 w-3" /> {pet.temperament}
            </Chip>
          )}
          <Chip className={COAT_CHIP[latestCoat].cls}>{COAT_CHIP[latestCoat].label}</Chip>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-DEFAULT bg-border text-center">
          <Fact label="Visits" value={String(completedCount)} />
          <Fact
            label="Last groom"
            value={weeksSince === null ? "—" : weeksSince === 0 ? "This week" : `${weeksSince}w ago`}
          />
          <Fact
            label="Next due"
            value={
              weeksSince === null
                ? "—"
                : overdue
                  ? "Due now"
                  : `${defaultRebookWeeks - weeksSince}w`
            }
            accent={overdue}
          />
        </div>

        {/* Standing notes */}
        <div className="flex flex-col gap-2">
          <Textarea
            label="Standing notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Temperament, coat, allergies, handling…"
          />
          {dirty && (
            <div>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    await updatePetNotes(pet.id, notes);
                    toast.success("Notes saved");
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Couldn't save notes",
                    );
                  }
                }}
              >
                <Save className="h-4 w-4" />
                Save notes
              </Button>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
            <Clock className="h-4 w-4 text-ink-subtle" /> Grooming history
          </p>
          {history.length === 0 ? (
            <p className="rounded-xl bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">
              No visits recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-DEFAULT">
              {history.map(({ appointment, service }) => (
                <div key={appointment.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {service.name}{" "}
                      <span className="font-normal text-ink-subtle">
                        · {formatGBP(appointment.priceGBP)}
                      </span>
                    </p>
                    <p className="text-xs text-ink-subtle">{formatDate(appointment.start)}</p>
                    {appointment.notes && (
                      <p className="mt-1 text-xs text-ink-muted">{appointment.notes}</p>
                    )}
                    {appointment.report && (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">
                        <Heart className="h-3 w-3" /> Before &amp; after sent
                      </p>
                    )}
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-surface px-2 py-3">
      <p className={cn("tabular-nums text-sm font-semibold", accent ? "text-accent" : "text-ink")}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-subtle">{label}</p>
    </div>
  );
}

interface PetDraft {
  name: string;
  breed: string;
  size: DogSize;
  coatType: string;
  temperament: string;
  notes: string;
}

function AddPetModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (draft: PetDraft) => void;
}) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<DogSize>("medium");
  const [coatType, setCoatType] = useState("");
  const [temperament, setTemperament] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();

  function reset() {
    setName("");
    setBreed("");
    setSize("medium");
    setCoatType("");
    setTemperament("");
    setNotes("");
    setError(undefined);
  }

  function submit() {
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    onAdd({
      name: name.trim(),
      breed: breed.trim() || "Unknown",
      size,
      coatType: coatType.trim(),
      temperament: temperament.trim(),
      notes: notes.trim(),
    });
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add pet"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            <PawPrint className="h-4 w-4" />
            Add pet
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <Input label="Pet name" value={name} onChange={(e) => setName(e.target.value)} error={error} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Breed" placeholder="e.g. Cockapoo" value={breed} onChange={(e) => setBreed(e.target.value)} />
          <Select label="Size" value={size} onChange={(e) => setSize(e.target.value as DogSize)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="giant">Giant</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Coat type" placeholder="e.g. Curly" value={coatType} onChange={(e) => setCoatType(e.target.value)} />
          <Input label="Temperament" placeholder="e.g. Easygoing" value={temperament} onChange={(e) => setTemperament(e.target.value)} />
        </div>
        <Textarea
          label="Grooming notes"
          placeholder="Allergies, handling, coat care…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
