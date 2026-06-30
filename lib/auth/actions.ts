"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Sign the current user out and send them to the login page. */
export async function signOutAction() {
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect(configured ? "/login" : "/");
}
