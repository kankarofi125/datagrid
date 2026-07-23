"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatNaira } from "@/lib/money";

type User = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  kycTier: string;
  kycStatus: string;
  isActive: boolean;
  lifetimeVolume: number;
  balance: number;
  referralCode: string;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const load = useCallback((query: string) => {
    fetch(`/api/admin/users?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  function patch(id: string, body: Record<string, unknown>) {
    start(async () => {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      load(q);
    });
  }

  if (loading) {
    return <SkeletonPage variant="list" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="IDENTITY" title="USERS." />
      <div className="flex gap-2">
        <Input
          placeholder="Search phone or code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          mono
        />
        <Button onClick={() => load(q)} disabled={pending}>
          Search
        </Button>
      </div>
      <div className="overflow-x-auto surface">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink/[0.03]">
              {["PHONE", "ROLE", "KYC", "BALANCE", "VOLUME", "ACTIVE", "ACTIONS"].map(
                (h) => (
                  <th
                    key={h}
                    className="font-mono-num px-3 py-2 text-[10px] tracking-wider text-ink/45"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <p className="font-mono-num font-medium">{u.phone}</p>
                  <p className="text-xs text-ink/45">{u.referralCode}</p>
                </td>
                <td className="font-mono-num px-3 py-2 text-xs">{u.role}</td>
                <td className="font-mono-num px-3 py-2 text-xs">
                  {u.kycTier}/{u.kycStatus}
                </td>
                <td className="font-mono-num px-3 py-2">
                  {formatNaira(u.balance, { compact: true })}
                </td>
                <td className="font-mono-num px-3 py-2">
                  {formatNaira(u.lifetimeVolume, { compact: true })}
                </td>
                <td className="px-3 py-2">{u.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        patch(u.id, {
                          role: u.role === "AGENT" ? "USER" : "AGENT",
                        })
                      }
                    >
                      {u.role === "AGENT" ? "Demote" : "Make agent"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patch(u.id, { isActive: !u.isActive })}
                    >
                      {u.isActive ? "Suspend" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        patch(u.id, { kycStatus: "APPROVED", kycTier: "T1" })
                      }
                    >
                      KYC T1
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
