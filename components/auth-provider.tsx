"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface AuthValue {
  /** The logged-in Supabase user, or null. Always null in demo mode. */
  user: User | null;
  /** The user's business (tenant) id, from their public.users row. */
  businessId: string | null;
  /** True while we're still checking for a session (configured mode only). */
  loading: boolean;
  /** Whether real auth is switched on (real Supabase keys present). */
  configured: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [user, setUser] = useState<User | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  // In demo mode there's nothing to load, so start resolved.
  const [loading, setLoading] = useState(configured);

  // Track the Supabase session (configured mode only).
  useEffect(() => {
    if (!configured) return;
    const supabase = createSupabaseBrowserClient();
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  // Resolve the tenant (business) id from the user's profile row.
  useEffect(() => {
    if (!configured || !user) {
      setBusinessId(null);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    let active = true;
    supabase
      .from("users")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBusinessId((data?.business_id as string | undefined) ?? null);
      });
    return () => {
      active = false;
    };
  }, [configured, user]);

  const value = useMemo<AuthValue>(
    () => ({ user, businessId, loading, configured }),
    [user, businessId, loading, configured],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
