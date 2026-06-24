"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { useStore } from "@/lib/mock/store";
import { useDemoLoad } from "@/lib/use-demo-load";
import type { DogSize } from "@/lib/types";
import { initials } from "@/lib/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClientsPage() {
  const loading = useDemoLoad();
  const { clients, getPetsForClient, addClient, addPet } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...clients].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
    if (!q) return sorted;
    return sorted.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`
        .toLowerCase()
        .includes(q),
    );
  }, [clients, query]);

  return (
    <>
      <PageHeader
        title="Clients & pets"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add client
          </Button>
        }
      />

      <div className="mb-4">
        <Input
          leadingIcon={<Search />}
          placeholder="Search by name, email or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={query ? <Users /> : undefined}
            art={query ? undefined : <DogEmpty />}
            title={query ? "No matches" : "No clients yet"}
            description={
              query
                ? "Try a different name, email or phone number."
                : "Add your first dog owner and we'll handle the reminders from here."
            }
            action={
              !query && (
                <Button size="sm" onClick={() => setOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Add client
                </Button>
              )
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => {
              const pets = getPetsForClient(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors duration-fast hover:bg-surface-sunken"
                >
                  <Avatar initials={initials(c.firstName, c.lastName)} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-ink">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="truncate text-xs text-ink-muted">
                      {pets.length > 0
                        ? pets.map((p) => p.name).join(", ")
                        : "No pets yet"}{" "}
                      · {c.phone}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <AddClientModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(client, pet) => {
          const c = addClient(client);
          if (pet) addPet({ ...pet, clientId: c.id });
          toast.success(`${c.firstName} ${c.lastName} added`);
        }}
      />
    </>
  );
}

interface ClientDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}
interface PetDraft {
  name: string;
  breed: string;
  size: DogSize;
  notes: string;
}

function AddClientModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (
    client: ClientDraft,
    pet?: { name: string; breed: string; size: DogSize; notes: string },
  ) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<DogSize>("medium");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setPetName("");
    setBreed("");
    setSize("medium");
    setNotes("");
    setErrors({});
  }

  function submit() {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "Required";
    if (!lastName.trim()) next.lastName = "Required";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email";
    if (!phone.trim()) next.phone = "Required";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onCreate(
      { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() },
      petName.trim()
        ? { name: petName.trim(), breed: breed.trim() || "Unknown", size, notes: notes.trim() }
        : undefined,
    );
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
      title="Add client"
      description="Create a client record, and optionally their first pet."
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
            Add client
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={errors.firstName}
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={errors.lastName}
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
        />

        <div className="border-t border-DEFAULT pt-4">
          <p className="mb-3 text-sm font-medium text-ink">
            First pet{" "}
            <span className="font-normal text-ink-subtle">(optional)</span>
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Pet name"
                placeholder="e.g. Biscuit"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
              />
              <Input
                label="Breed"
                placeholder="e.g. Cockapoo"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>
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
        </div>
      </div>
    </Modal>
  );
}
