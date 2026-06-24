"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarPlus,
  Mail,
  Phone,
  PlusCircle,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { ErrorState } from "@/components/ui/error-state";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";
import { BookingForm } from "@/components/booking-form";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { DogSize, Pet } from "@/lib/types";
import { formatDate, formatGBP, initials } from "@/lib/format";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const loading = useDemoLoad();
  const { getClient, getPetsForClient, addPet } = useStore();
  const [addingPet, setAddingPet] = useState(false);
  const [booking, setBooking] = useState(false);

  const client = getClient(params.id);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
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
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {client.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {client.phone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAddingPet(true)}>
            <PlusCircle className="h-4 w-4" />
            Add pet
          </Button>
          <Button size="sm" onClick={() => setBooking(true)} disabled={pets.length === 0}>
            <CalendarPlus className="h-4 w-4" />
            Book
          </Button>
        </div>
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
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}

      <AddPetModal
        open={addingPet}
        onClose={() => setAddingPet(false)}
        onAdd={(draft) => {
          addPet({ ...draft, clientId: client.id });
          toast.success(`${draft.name} added`);
        }}
      />
      <BookingForm open={booking} onClose={() => setBooking(false)} />
    </>
  );
}

function PetCard({ pet }: { pet: Pet }) {
  const { getHistoryForPet, updatePetNotes } = useStore();
  const [notes, setNotes] = useState(pet.notes);
  const history = getHistoryForPet(pet.id);
  const dirty = notes !== pet.notes;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar initials={initials(pet.name)} tone="accent" />
          <div>
            <CardTitle>{pet.name}</CardTitle>
            <p className="text-xs text-ink-muted">
              {pet.breed} · <span className="capitalize">{pet.size}</span>
            </p>
          </div>
        </div>
        <Badge>{history.length} visit{history.length === 1 ? "" : "s"}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Textarea
            label="Grooming notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div>
            <Button
              size="sm"
              variant="secondary"
              disabled={!dirty}
              onClick={() => {
                updatePetNotes(pet.id, notes);
                toast.success("Notes saved");
              }}
            >
              <Save className="h-4 w-4" />
              Save notes
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">History</p>
          {history.length === 0 ? (
            <p className="rounded-lg bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">
              No visits recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-DEFAULT">
              {history.map(({ appointment, service }) => (
                <div
                  key={appointment.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {service.name}{" "}
                      <span className="font-normal text-ink-subtle">
                        · {formatGBP(appointment.priceGBP)}
                      </span>
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {formatDate(appointment.start)}
                    </p>
                    {appointment.notes && (
                      <p className="mt-1 text-xs text-ink-muted">
                        {appointment.notes}
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

interface PetDraft {
  name: string;
  breed: string;
  size: DogSize;
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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();

  function reset() {
    setName("");
    setBreed("");
    setSize("medium");
    setNotes("");
    setError(undefined);
  }

  function submit() {
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    onAdd({ name: name.trim(), breed: breed.trim() || "Unknown", size, notes: notes.trim() });
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            Add pet
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <Input
          label="Pet name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        <Input
          label="Breed"
          placeholder="e.g. Cockapoo"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
        />
        <Select
          label="Size"
          value={size}
          onChange={(e) => setSize(e.target.value as DogSize)}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </Select>
        <Textarea
          label="Grooming notes"
          placeholder="Temperament, coat, allergies, handling…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
