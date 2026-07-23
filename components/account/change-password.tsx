"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { checkPassword, PASSWORD_RULE_HINT } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

const BAR_TONE = ["bg-danger", "bg-warning", "bg-accent", "bg-success"] as const;

export function ChangePassword() {
  const { user, configured } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const strength = checkPassword(next);
  const mismatch = confirm.length > 0 && confirm !== next;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!configured || !user?.email) {
      setError("Password changes are only available once you're signed in.");
      return;
    }
    if (!current) {
      setError("Enter your current password.");
      return;
    }
    if (!strength.ok) {
      setError(strength.issues[0] ?? "Please choose a stronger password.");
      return;
    }
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    if (next === current) {
      setError("Choose a password different from your current one.");
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    try {
      // Verify the current password by re-authenticating first.
      const { error: reauth } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (reauth) {
        setError("Your current password is incorrect.");
        setSaving(false);
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) {
        setError(updateErr.message || "Couldn't update your password. Please try again.");
        setSaving(false);
        return;
      }
      // Fire-and-forget security notice to the user's own email.
      fetch("/api/account/password-changed", { method: "POST" }).catch(() => {});
      toast.success("Password changed", { description: "We've emailed you a confirmation." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Input
        label="Current password"
        type={show ? "text" : "password"}
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <div>
        <Input
          label="New password"
          type={show ? "text" : "password"}
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
        type={show ? "text" : "password"}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch ? "Passwords don't match" : undefined}
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {show ? "Hide" : "Show"} passwords
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Button type="submit" size="md" loading={saving} disabled={saving}>
          <KeyRound className="h-4 w-4" />
          Change password
        </Button>
      </div>
    </form>
  );
}
