"use client";

/**
 * First-login "set your own password" banner.
 *
 * Shows when the signed-in user carries a `must_change_password` flag in their
 * metadata — i.e. their password was set for them rather than chosen by them.
 * Dismissible and, on dismiss/act, clears the flag so it never nags again.
 *
 * Note: with the invite-based onboarding (Part 2), customers always set their
 * OWN password when they claim their account, so this flag is never set and the
 * banner does not appear — it's a safety net for any externally-set password.
 */
import { useState } from "react";
import Link from "next/link";
import { KeyRound, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function FirstLoginBanner() {
  const { user, configured } = useAuth();
  const [hidden, setHidden] = useState(false);

  const flagged =
    configured && (user?.user_metadata as { must_change_password?: boolean } | undefined)?.must_change_password === true;
  if (!flagged || hidden) return null;

  function clearFlag() {
    createSupabaseBrowserClient()
      .auth.updateUser({ data: { must_change_password: false } })
      .catch(() => {});
    setHidden(true);
  }

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-soft p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning text-ink-inverse">
        <KeyRound className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-warning-deep">Set your own password</p>
        <p className="mt-0.5 text-sm text-warning-deep/90">
          Your account was set up for you. For your security, choose a password only you know.
        </p>
        <Link
          href="/settings"
          onClick={clearFlag}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-warning-deep px-3 py-1.5 text-sm font-medium text-ink-inverse transition-opacity hover:opacity-90"
        >
          <KeyRound className="h-3.5 w-3.5" /> Change password
        </Link>
      </div>
      <button
        onClick={clearFlag}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-1 text-warning-deep/70 hover:bg-warning/20 hover:text-warning-deep"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
