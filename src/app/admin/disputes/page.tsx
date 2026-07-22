"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/motion/Reveal";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatNaira } from "@/lib/money";

type Dispute = {
  id: string;
  reason: string;
  status: string;
  userPhone: string;
  orderRef: string;
  amount: number;
  service: string;
  createdAt: string;
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [orderRef, setOrderRef] = useState("");
  const [reason, setReason] = useState("Customer complaint");
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/admin/disputes")
      .then((r) => r.json())
      .then((d) => setDisputes(d.disputes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openDispute() {
    start(async () => {
      await fetch("/api/admin/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", orderRef, reason }),
      });
      load();
    });
  }

  function resolve(id: string, refund: boolean) {
    start(async () => {
      await fetch("/api/admin/disputes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "RESOLVED",
          refund,
          resolution: refund ? "Refunded to wallet" : "Resolved without refund",
        }),
      });
      load();
    });
  }

  if (loading) {
    return <SkeletonPage variant="list" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="SUPPORT" title="DISPUTES." />

      <div className="flex max-w-lg flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Order ref DG-…"
          mono
          value={orderRef}
          onChange={(e) => setOrderRef(e.target.value)}
        />
        <Button onClick={openDispute} disabled={pending}>
          Open
        </Button>
      </div>
      <Input
        label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <ul className="space-y-2">
        {disputes.map((d) => (
          <li key={d.id} className="surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono-num text-green">{d.orderRef}</p>
                <p className="text-sm">
                  {d.userPhone} · {d.service} · {formatNaira(d.amount, { compact: true })}
                </p>
                <p className="mt-1 text-sm text-ink/65">{d.reason}</p>
                <p className="font-mono-num text-[10px] text-ink/40">
                  {d.status} · {new Date(d.createdAt).toLocaleString("en-NG")}
                </p>
              </div>
              {(d.status === "OPEN" || d.status === "INVESTIGATING") && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => resolve(d.id, true)} disabled={pending}>
                    Resolve + refund
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => resolve(d.id, false)}
                    disabled={pending}
                  >
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
        {disputes.length === 0 && (
          <p className="text-sm text-ink/50">No disputes</p>
        )}
      </ul>
    </div>
  );
}
