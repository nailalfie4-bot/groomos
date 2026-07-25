"use client";

import { useState } from "react";

/** Claim flow: creates a ClaimRequest, then sends the groomer to GroomOS signup
 *  with the listing id attached so their new account can populate the profile. */
export function ClaimForm({ groomerId }: { groomerId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verification, setVerification] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please add your name and email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/directory/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ groomerId, name, email, phone, businessVerification: verification }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.redirectUrl) {
        window.location.assign(d.redirectUrl);
        return;
      }
      setError(d.message || "Something went wrong. Please try again.");
    } catch {
      setError("Couldn't submit — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Your name</label>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Email</label>
        <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">Phone (optional)</label>
        <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          How can we verify this is your business? (website, social, companies house…)
        </label>
        <textarea className={field} rows={2} value={verification} onChange={(e) => setVerification(e.target.value)} />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-ink-inverse transition-colors hover:bg-accent-600 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Claim this profile"}
      </button>
      <p className="text-[11px] text-ink-subtle">
        Claiming takes you to GroomOS signup. Once verified, you control your photos, services, prices and contact
        details.
      </p>
    </form>
  );
}
