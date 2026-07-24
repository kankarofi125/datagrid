"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type Log = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorPhone?: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <SkeletonPage variant="list" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="COMPLIANCE" title="AUDIT LOG." />
      <Card as="ul" className="divide-y divide-line">
        {logs.map((l) => (
          <li key={l.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-semibold">
                {l.action}{" "}
                <span className="font-mono-num text-xs font-normal text-ink/45">
                  {l.entityType}
                  {l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}
                </span>
              </p>
              <p className="font-mono-num text-[10px] text-ink/40">
                {new Date(l.createdAt).toLocaleString("en-NG")}
              </p>
            </div>
            <p className="text-xs text-ink/55">Actor: {l.actorPhone || "system"}</p>
            {(l.before != null || l.after != null) && (
              <pre className="mt-1 max-h-24 overflow-auto font-mono-num text-[10px] text-ink/50">
                {JSON.stringify({ before: l.before, after: l.after })}
              </pre>
            )}
          </li>
        ))}
        {logs.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-ink/50">No audit events</li>
        )}
      </Card>
    </div>
  );
}
