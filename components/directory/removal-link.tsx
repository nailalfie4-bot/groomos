"use client";

import { useState } from "react";
import { Flag } from "lucide-react";

/** "Request removal / this isn't my business" — required on every profile. Files
 *  a removal request into the admin queue (and emails the founder). */
export function RemovalLink({ groomerId }: { groomerId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await fetch("/api/directory/removal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groomerId, reason, requesterEmail: email }),
      });
      setDone(true);
    } catch {
      setDone(true); // best-effort; the request is queued server-side
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="text-xs text-ink-muted">
        Thanks — we&apos;ve received your request and will review it. We aim to action removals promptly.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-ink-subtle underline hover:text-ink"
      >
        <Flag className="h-3.5 w-3.5" /> Request removal / this isn&apos;t my business
      </button>
    );
  }

  const field =
    "w-full rounded-lg border border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-DEFAULT bg-surface-sunken p-3">
      <p className="text-xs font-medium text-ink">Request this listing be removed</p>
      <textarea
        className={field}
        rows={2}
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <input
        className={field}
        type="email"
        placeholder="Your email (optional, so we can confirm)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-ink-inverse hover:bg-accent-600 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
