"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyAuthError } from "@/lib/auth/errors";

export default function SignupPage() {
  const configured = isSupabaseConfigured();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!configured) {
      setError("Supabase isn't configured here — this is demo mode.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    // The business name rides along as user metadata; a DB trigger turns it
    // into a businesses row + a linked users row (see migration 0002).
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { business_name: businessName.trim() } },
      });
      if (signUpError) {
        setError(friendlyAuthError(signUpError, "signup"));
        setLoading(false);
        return;
      }

      if (!data.session) {
        // No session means email confirmation is ON.
        setLoading(false);
        setInfo(
          "Account created — but email confirmation is ON in Supabase, so you must confirm via the emailed link before you can log in. For instant testing, turn it OFF (Authentication → Providers → Email → Confirm email) and sign up again.",
        );
        return;
      }

      // Signed in. Verify the signup trigger actually created the tenant, so a
      // missing migration 0002 tells you clearly instead of failing silently.
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, business_id")
        .eq("id", data.user?.id ?? "")
        .maybeSingle();

      if (profileError) {
        setLoading(false);
        setError(
          "Your account was created, but its business profile couldn't be read — the database may not be fully set up. Open /debug to check.",
        );
        return;
      }
      const businessId = (profile as { business_id?: string } | null)?.business_id;
      if (!businessId) {
        setLoading(false);
        setError(
          "Your account was created, but its business wasn't set up — the signup trigger (migration 0002) hasn't run. Open /debug to confirm, then delete this user in Supabase (Authentication → Users), run 0002, and sign up again.",
        );
        return;
      }

      window.location.assign("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err as { message?: string }, "signup"));
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start running your grooming business in GroomOS."
      configured={configured}
      altPrompt="Already have an account?"
      altLabel="Log in"
      altHref="/login"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Business name"
          placeholder="e.g. Paws & Co. Grooming"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          required
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@yourbusiness.co.uk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 6 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-success-deep">{info}</p>}
        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
