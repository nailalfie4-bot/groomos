"use client";

/**
 * /welcome — where an invited groomer lands after clicking their invite link
 * (the /auth/callback route has already verified the token and set their
 * session). They set THEIR OWN password here; nobody else ever sees it. On
 * success their invite is marked accepted and they drop into their ready-made,
 * fully-configured account.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth-card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { checkPassword, PASSWORD_RULE_HINT } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

const BAR_TONE = ["bg-danger", "bg-warning", "bg-accent", "bg-success"] as const;

export default function WelcomePage() {
  const configured = isSupabaseConfigured();
  // Demo (no Supabase) shows the form so the UI is viewable; live checks for the
  // real invite session set by /auth/callback.
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">(
    configured ? "checking" : "ok",
  );
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const { error: updateErr } = await supabase.auth.updateUser({
        password: next,
        data: { must_change_password: false },
      });
      if (updateErr) {
        setError(updateErr.message || "Couldn't set your password. The link may have expired.");
        setSaving(false);
        return;
      }
      // Mark the invite claimed (best-effort), then into the ready account.
      await fetch("/api/onboarding/accept", { method: "POST" }).catch(() => {});
      toast.success("You're all set — welcome to GroomOS! 🐾");
      window.location.assign("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <AuthCard
      title="Welcome to GroomOS"
      subtitle="Set your password to finish claiming your account."
      configured={configured}
      altPrompt="Already set up?"
      altLabel="Log in"
      altHref="/login"
    >
      {ready === "invalid" ? (
        <p className="rounded-xl border border-DEFAULT bg-surface-sunken p-4 text-sm text-ink-muted">
          This invite link is invalid or has expired. Ask for a fresh invite, then open it on this
          device.
        </p>
      ) : ready === "checking" ? (
        <p className="text-sm text-ink-muted">Checking your invite…</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent-50 p-3 text-xs leading-relaxed text-ink-muted">
            <PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            Your account is ready with your services, prices and settings. Choose a password only you
            know — no one else can see it.
          </div>
          <div>
            <Input
              label="Create a password"
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
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? "Passwords don't match" : undefined}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" loading={saving} className="mt-1 w-full">
            Set password &amp; get started
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
