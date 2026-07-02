"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyAuthError } from "@/lib/auth/errors";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Supabase isn't configured here — this is demo mode.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(friendlyAuthError(signInError, "login"));
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(friendlyAuthError(err as { message?: string }, "login"));
      setLoading(false);
      return;
    }
    // Full navigation so the server (middleware + layouts) picks up the session.
    // Only honour same-origin paths (no open redirects).
    const raw = new URLSearchParams(window.location.search).get("redirectedFrom");
    const dest = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
    window.location.assign(dest);
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your GroomOS account."
      configured={configured}
      altPrompt="New to GroomOS?"
      altLabel="Create an account"
      altHref="/signup"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
