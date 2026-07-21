"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function DisputeForm({ orderRef }: { orderRef: string }) {
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      setError(null);
      setMsg(null);
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not open dispute");
        return;
      }
      setMsg("Dispute opened. Support will review.");
      setReason("");
    });
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
        OPEN DISPUTE
      </p>
      <Input
        className="mt-2"
        label="What went wrong?"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Not delivered, wrong number…"
      />
      <Button
        className="mt-3"
        size="sm"
        fullWidth
        onClick={submit}
        disabled={pending || reason.length < 4}
      >
        Submit dispute
      </Button>
      {msg && (
        <p className="mt-2 text-sm text-green" role="status">
          {msg}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
