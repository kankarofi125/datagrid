"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { formatNaira } from "@/lib/money";
import { Card } from "@/components/ui/Card";

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
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/admin/wallets")
      .then((r) => r.json())
      .then((d) => setRequests(d.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
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

  if (loading) {
    return <SkeletonPage variant="admin" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="DUAL APPROVAL" title="WALLET CREDITS." description="Manual credits require two admins: one requests, another approves. Dev may force
          with same admin only when dual-approval blocks." />

      <Card
        className="max-w-md p-5"
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
        <PhoneInput label="User phone" value={phone} onChange={setPhone} />
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
        <Button type="submit" fullWidth disabled={pending}>
          Create credit request
        </Button>
        {msg && <p className="text-sm text-green">{msg}</p>}
        {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Card>

      <ul className="space-y-2">
        {requests.map((r) => (
          <Card
            as="li"
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
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
          </Card>
        ))}
      </ul>
    </div>
  );
}
