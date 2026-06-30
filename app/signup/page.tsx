"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { business_name: businessName.trim() } },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      // Email confirmation is OFF -> signed in immediately.
      window.location.assign("/dashboard");
      return;
    }
    // Email confirmation is ON -> no session yet.
    setLoading(false);
    setInfo("Account created. Check your email to confirm, then log in.");
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
