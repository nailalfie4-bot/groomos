/**
 * Pets data access — tenant-scoped. Pets carry a denormalised business_id (for
 * fast RLS) plus their owning client_id. The app's Pet type is keyed by
 * clientId; business scoping is handled here and by RLS.
 */
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { NewPetInput } from "@/lib/mock/store";
import type { DogSize, Pet } from "@/lib/types";

interface PetRow {
  id: string;
  business_id: string;
  client_id: string;
  name: string;
  breed: string | null;
  size: DogSize;
  coat_type: string | null;
  temperament: string | null;
  notes: string | null;
  date_of_birth: string | null;
  rebook_weeks: number | null;
}

export function rowToPet(r: PetRow): Pet {
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    breed: r.breed ?? "",
    size: r.size,
    coatType: r.coat_type ?? undefined,
    temperament: r.temperament ?? undefined,
    notes: r.notes ?? "",
    dateOfBirth: r.date_of_birth ?? undefined,
    rebookWeeks: r.rebook_weeks ?? undefined,
  };
}

/** All pets for a business. */
export async function fetchPets(businessId: string): Promise<Pet[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as PetRow[]).map(rowToPet);
}

/** Create a pet under a client in the caller's business. */
export async function insertPet(
  businessId: string,
  input: NewPetInput,
  id?: string,
): Promise<Pet> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("pets")
    .insert({
      ...(id ? { id } : {}),
      business_id: businessId,
      client_id: input.clientId,
      name: input.name,
      breed: input.breed,
      size: input.size,
      coat_type: input.coatType || null,
      temperament: input.temperament || null,
      notes: input.notes ?? "",
      rebook_weeks: input.rebookWeeks ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToPet(data as PetRow);
}

/** Update a pet's standing notes. */
export async function updatePetNotes(petId: string, notes: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("pets").update({ notes }).eq("id", petId);
  if (error) throw error;
}

/** Update a pet's rebook frequency (weeks). Null clears it. */
export async function updatePetRebookWeeks(petId: string, weeks: number | null): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("pets").update({ rebook_weeks: weeks }).eq("id", petId);
  if (error) throw error;
}
