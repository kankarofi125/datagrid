"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatNaira } from "@/lib/money";

type Req = {
  id: string;
  phone?: string;
  amount: number;
  reason: string;
  status: string;
  requestedBy: string;
  approvedBy?: string | null;
  createdAt: string;
};

export default function AdminWalletsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("1000");
  const [reason, setReason] = useState("Support goodwill");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/admin/wallets")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests || []));
  }

  useEffect(() => {
    load();
  }, []);

  function create() {
    start(async () => {
      setError(null);
      setMsg(null);
      const res = await fetch("/api/admin/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, amount: Number(amount), reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setMsg(`Request ${data.request.id.slice(0, 8)}… pending second approval`);
      load();
    });
  }

  function decide(id: string, decision: "APPROVE" | "REJECT", force?: boolean) {
    start(async () => {
      setError(null);
      setMsg(null);
      const res = await fetch("/api/admin/wallets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision, force }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setMsg(`${decision} · ${data.orderRef || data.status}`);
      load();
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="DUAL APPROVAL" title="WALLET CREDITS." description="Manual credits require two admins: one requests, another approves. Dev may force
          with same admin only when dual-approval blocks." />

      <div className="max-w-md space-y-3 surface p-5">
        <Input label="User phone" mono value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input
          label="Amount"
          mono
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button fullWidth onClick={create} disabled={pending}>
          Create credit request
        </Button>
        {msg && <p className="text-sm text-green">{msg}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <ul className="space-y-2">
        {requests.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 surface p-4"
          >
            <div>
              <p className="font-mono-num font-semibold text-green">
                {formatNaira(r.amount)}
              </p>
              <p className="text-sm">
                {r.phone} · {r.reason}
              </p>
              <p className="font-mono-num text-[10px] text-ink/45">
                {r.status} · {new Date(r.createdAt).toLocaleString("en-NG")}
              </p>
            </div>
            {r.status === "PENDING" && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => decide(r.id, "APPROVE")} disabled={pending}>
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => decide(r.id, "APPROVE", true)}
                  disabled={pending}
                >
                  Force (dev)
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => decide(r.id, "REJECT")}
                  disabled={pending}
                >
                  Reject
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
