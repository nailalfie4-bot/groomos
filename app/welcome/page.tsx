"use client";

/**
 * /welcome — where an invited groomer lands from their invite link
 * (…/welcome?invite=<token>). Landing here does NOT consume the token: we only
 * READ it (via /api/onboarding/verify) to show the form, so pasting the link
 * into WhatsApp / Instagram / iMessage and having their crawler fetch it can't
 * kill the invite. The token is spent only when the groomer presses the button
 * to set THEIR OWN password (POST /api/onboarding/claim) — nobody else ever
 * sees it. They're then signed in and dropped into their ready-made account.
 *
 * Legacy fallback: an older invite that still arrives via /auth/callback lands
 * here with a session and no ?invite= — that path keeps working too.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
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

type Phase =
  | { kind: "checking" }
  | { kind: "form"; businessName?: string; email?: string } // ready to set a password
  | { kind: "claimed" } // already set up → log in
  | { kind: "invalid" }; // expired / unknown → request a fresh link

export default function WelcomePage() {
  const configured = isSupabaseConfigured();
  // Demo (no Supabase) just shows the form so the UI is viewable.
  const [phase, setPhase] = useState<Phase>(configured ? { kind: "checking" } : { kind: "form" });
  // Our durable invite token from the URL (new links). Empty for the legacy path.
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | undefined>();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const t = new URLSearchParams(window.location.search).get("invite")?.trim() || null;
    setToken(t);

    if (t) {
      // New flow: verify the token WITHOUT consuming it.
      fetch(`/api/onboarding/verify?token=${encodeURIComponent(t)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.valid) {
            setEmail(d.email);
            setPhase({ kind: "form", businessName: d.businessName, email: d.email });
          } else if (d?.reason === "claimed") {
            setPhase({ kind: "claimed" });
          } else {
            setPhase({ kind: "invalid" });
          }
        })
        .catch(() => setPhase({ kind: "invalid" }));
      return;
    }

    // Legacy fallback: an older invite that verified via /auth/callback lands
    // here already signed in. Show the form iff there's a session.
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .getSession()
      .then(({ data }) => setPhase(data.session ? { kind: "form" } : { kind: "invalid" }))
      .catch(() => setPhase({ kind: "invalid" }));
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

      if (token) {
        // New flow: claim the invite server-side (sets password + confirms
        // email), then sign in with the password we just chose.
        const res = await fetch("/api/onboarding/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, password: next }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok || !d?.ok) {
          if (d?.error === "already_claimed") setPhase({ kind: "claimed" });
          else if (d?.error === "expired" || d?.error === "invalid_link") setPhase({ kind: "invalid" });
          setError(d?.message ?? "Couldn't set your password. Please try again.");
          setSaving(false);
          return;
        }
        const signInEmail = (d.email as string) || email;
        if (!signInEmail) {
          setError("Something went wrong signing you in — please log in with your new password.");
          setSaving(false);
          return;
        }
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: signInEmail,
          password: next,
        });
        if (signInErr) {
          // Password is set — just send them to log in.
          toast.success("Password set — please log in to finish.");
          window.location.assign("/login");
          return;
        }
      } else {
        // Legacy fallback: session-based update (no ?invite= token present).
        const { error: updateErr } = await supabase.auth.updateUser({
          password: next,
          data: { must_change_password: false },
        });
        if (updateErr) {
          setError(updateErr.message || "Couldn't set your password. The link may have expired.");
          setSaving(false);
          return;
        }
        await fetch("/api/onboarding/accept", { method: "POST" }).catch(() => {});
      }

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
      {phase.kind === "checking" ? (
        <p className="text-sm text-ink-muted">Checking your invite…</p>
      ) : phase.kind === "claimed" ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl border border-DEFAULT bg-surface-sunken p-4 text-sm text-ink-muted">
            This account is already set up. Log in with the password you chose.
          </p>
          <Link href="/login">
            <Button size="lg" className="w-full">Go to log in</Button>
          </Link>
        </div>
      ) : phase.kind === "invalid" ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl border border-DEFAULT bg-surface-sunken p-4 text-sm text-ink-muted">
            This invite link is invalid or has expired. Ask for a fresh one — it only takes a moment.
          </p>
          <Link href="/invite-expired">
            <Button size="lg" className="w-full">Request a fresh link</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent-50 p-3 text-xs leading-relaxed text-ink-muted">
            <PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            {phase.kind === "form" && phase.businessName
              ? `${phase.businessName} is ready with your services, prices and settings. `
              : "Your account is ready with your services, prices and settings. "}
            Choose a password only you know — no one else can see it.
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
