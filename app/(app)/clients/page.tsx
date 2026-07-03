"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, PawPrint, Search, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { DogEmpty } from "@/components/illustrations";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { useClientsData } from "@/lib/data/use-clients-data";
import type { DogSize } from "@/lib/types";
import { initials } from "@/lib/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ClientsPage() {
  const { clients, pets, loading, getPetsForClient, addClient, addPet } =
    useClientsData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...clients].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    );
    if (!q) return sorted;
    return sorted.filter((c) => {
      const petNames = getPetsForClient(c.id).map((p) => p.name).join(" ");
      return `${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${petNames}`
        .toLowerCase()
        .includes(q);
    });
  }, [clients, query, getPetsForClient]);

  return (
    <>
      <PageHeader
        title="Clients & pets"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"} · ${pets.length} dog${pets.length === 1 ? "" : "s"}`}
        actions={
          <Button size="md" onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Add client
          </Button>
        }
      />

      <div className="mb-4">
        <Input
          leadingIcon={<Search />}
          placeholder="Search name, dog, email or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-DEFAULT bg-surface shadow-card">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <Skeleton className="h-10 w-10 rounded-full" />
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
                ? "Try a different name, dog, email or phone number."
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
          <ul className="divide-y divide-border">
            {filtered.map((c) => {
              const clientPets = getPetsForClient(c.id);
              return (
                <li key={c.id}>
                  <Link
                    href={`/clients/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-fast hover:bg-surface-sunken sm:gap-4 sm:px-5"
                  >
                    <Avatar
                      initials={initials(c.firstName, c.lastName)}
                      className="h-10 w-10 text-sm"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-ink">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="flex items-center gap-1 truncate text-xs text-ink-muted">
                        {clientPets.length > 0 ? (
                          <>
                            <PawPrint className="h-3 w-3 shrink-0 text-ink-subtle" />
                            {clientPets.map((p) => p.name).join(", ")}
                          </>
                        ) : (
                          "No pets yet"
                        )}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AddClientModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={async (client, pet) => {
          try {
            const c = await addClient(client);
            if (pet) await addPet({ ...pet, clientId: c.id });
            toast.success(`${c.firstName} ${c.lastName} added`);
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Couldn't add client",
            );
          }
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
  coatType: string;
  temperament: string;
  notes: string;
}

function AddClientModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (client: ClientDraft, pet?: PetDraft) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState<DogSize>("medium");
  const [coatType, setCoatType] = useState("");
  const [temperament, setTemperament] = useState("");
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
    setCoatType("");
    setTemperament("");
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
        ? {
            name: petName.trim(),
            breed: breed.trim() || "Unknown",
            size,
            coatType: coatType.trim(),
            temperament: temperament.trim(),
            notes: notes.trim(),
          }
        : undefined,
    );
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Add client"
      description="Create a client, and optionally their first dog."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit}>
            <UserPlus className="h-4 w-4" />
            Add client
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} />
        </div>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />

        <div className="border-t border-DEFAULT pt-4">
          <p className="mb-3 text-sm font-medium text-ink">
            First dog <span className="font-normal text-ink-subtle">(optional)</span>
          </p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Pet name" placeholder="e.g. Biscuit" value={petName} onChange={(e) => setPetName(e.target.value)} />
              <Input label="Breed" placeholder="e.g. Cockapoo" value={breed} onChange={(e) => setBreed(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Size" value={size} onChange={(e) => setSize(e.target.value as DogSize)}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="giant">Giant</option>
              </Select>
              <Input label="Coat type" placeholder="e.g. Curly" value={coatType} onChange={(e) => setCoatType(e.target.value)} />
            </div>
            <Input label="Temperament" placeholder="e.g. Easygoing" value={temperament} onChange={(e) => setTemperament(e.target.value)} />
            <Textarea
              label="Grooming notes"
              placeholder="Allergies, handling, coat care…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
