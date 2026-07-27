"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, MailCheck } from "lucide-react";

export default function InviteExpired() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/invite/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      /* always show the friendly confirmation */
    }
    setSent(true);
    setBusy(false);
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-DEFAULT bg-surface p-6 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-700">
          {sent ? <MailCheck className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
        </span>

        {sent ? (
          <>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Check your inbox</h1>
            <p className="mt-2 text-sm text-ink-muted">
              If <strong className="text-ink">{email}</strong> has a pending invite, a fresh link is on its way —
              it can take a minute, and do check spam. If it doesn&apos;t arrive, we&apos;ve alerted your GroomOS
              setup contact to send you one.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Your invite link has expired</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Invite links are single-use and time-limited. Enter your email and we&apos;ll send you a fresh one.
            </p>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3 text-left">
              <input
                type="email"
                autoCapitalize="none"
                placeholder="you@yourbusiness.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-accent-600 disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send me a fresh link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-5 text-xs text-ink-subtle">
          <Link href="/login" className="underline hover:text-ink">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
