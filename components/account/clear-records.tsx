"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Founder-only danger zone: wipe a business's clients/pets/appointments/services/
 *  groomers (keeps the account + settings). Requires a typed "DELETE". The API
 *  route re-checks the founder gate + the confirmation server-side. */
export function ClearRecords() {
  const [businessId, setBusinessId] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit() {
    if (confirm !== "DELETE") return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/founder/clear-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId: businessId.trim() || undefined, confirm }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        const summary = Object.entries(d.deleted as Record<string, number>)
          .map(([k, v]) => `${v} ${k}`)
          .join(", ");
        setResult(`Cleared: ${summary}.`);
        setConfirm("");
        toast.success("Records cleared", { description: "Reload to see the empty account." });
      } else {
        setResult(d.message || d.error || "Couldn't clear records.");
      }
    } catch {
      setResult("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft/40 p-4">
      <p className="flex items-start gap-2 text-sm text-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <span>
          Permanently deletes <strong>all clients, pets, appointments, services and groomers</strong> for an account
          (the account itself and its settings are kept). Use it to clear demo/test data. This can&apos;t be undone.
        </span>
      </p>
      <Input
        label="Business ID (leave blank to clear your own account)"
        placeholder="Your own account"
        value={businessId}
        onChange={(e) => setBusinessId(e.target.value)}
      />
      <Input
        label={'Type DELETE to confirm'}
        placeholder="DELETE"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <div>
        <Button variant="danger" size="sm" loading={busy} disabled={confirm !== "DELETE"} onClick={submit}>
          Clear records
        </Button>
      </div>
      {result && <p className="text-sm text-ink-muted">{result}</p>}
    </div>
  );
}
