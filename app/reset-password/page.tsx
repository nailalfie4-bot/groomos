"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { checkPassword, PASSWORD_RULE_HINT } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

const BAR_TONE = ["bg-danger", "bg-warning", "bg-accent", "bg-success"] as const;

export default function ResetPasswordPage() {
  const configured = isSupabaseConfigured();
  // Demo (no Supabase) shows the form so the UI is viewable; live checks for a
  // real recovery session set by /auth/callback.
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">(
    configured ? "checking" : "ok",
  );
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The shared /auth/callback set a recovery session before redirecting here.
  useEffect(() => {
    if (!configured) return;
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .getSession()
      .then(({ data }) => setReady(data.session ? "ok" : "invalid"))
      .catch(() => setReady("invalid"));
  }, [configured]);

  const strength = checkPassword(next);
  const mismatch = confirm.length > 0 && confirm !== next;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Password reset is only available in the live app.");
      return;
    }
    if (!strength.ok) {
      setError(strength.issues[0] ?? "Please choose a stronger password.");
      return;
    }
    if (next !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) {
        setError(updateErr.message || "Couldn't set your password. The link may have expired.");
        setSaving(false);
        return;
      }
      fetch("/api/account/password-changed", { method: "POST" }).catch(() => {});
      toast.success("Password updated — you're signed in.");
      window.location.assign("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a new password for your account."
      configured={configured}
      altPrompt="Need a new link?"
      altLabel="Request another"
      altHref="/forgot-password"
    >
      {ready === "invalid" ? (
        <p className="rounded-xl border border-DEFAULT bg-surface-sunken p-4 text-sm text-ink-muted">
          This reset link is invalid or has expired. Request a fresh one from{" "}
          <span className="font-medium text-ink">Reset your password</span>.
        </p>
      ) : ready === "checking" ? (
        <p className="text-sm text-ink-muted">Checking your link…</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              hint={PASSWORD_RULE_HINT}
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            {next.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        i < strength.score ? BAR_TONE[strength.score] : "bg-surface-sunken",
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-ink-muted">{strength.label}</span>
              </div>
            )}
          </div>
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? "Passwords don't match" : undefined}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" loading={saving} className="mt-1 w-full">
            Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
