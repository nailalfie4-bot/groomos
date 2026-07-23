"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Supabase isn't configured here — this is demo mode.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // Send them through the shared callback so the recovery session is set
      // (PKCE code exchange) before they land on the reset form.
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
    } catch {
      // Swallow — we always show the same confirmation so we never reveal
      // whether an account exists for this email.
    }
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a secure link to set a new one."
      configured={configured}
      altPrompt="Remembered it?"
      altLabel="Back to login"
      altHref="/login"
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success-deep">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on
            its way. Open it on this device — it expires soon and can only be used once.
          </p>
        </div>
      ) : (
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
