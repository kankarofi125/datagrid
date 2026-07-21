"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";

type Provider = {
  id: string;
  code: string;
  name: string;
  role: string;
  priority: number;
  isActive: boolean;
  successRate: number;
  lastHealth: string | null;
};

type Log = {
  id: string;
  provider: string;
  action: string;
  success: boolean;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
};

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [pending, start] = useTransition();

  function load() {
    fetch("/api/admin/providers")
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers || []);
        setLogs(d.logs || []);
      });
  }

  useEffect(() => {
    load();
  }, []);

  function patch(id: string, body: Record<string, unknown>) {
    start(async () => {
      await fetch("/api/admin/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      load();
    });
  }

  function action(act: string) {
    start(async () => {
      await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act }),
      });
      load();
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="VTU ROUTER"
        title="PROVIDERS."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => action("health")} disabled={pending}>
              Health check
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => action("simulate_failure")}
              disabled={pending}
            >
              Sim failure
            </Button>
          </div>
        }
      />

      <Reveal delay={120}>
      <ul className="space-y-3">
        {providers.map((p) => (
          <li
            key={p.id}
            className="surface surface-interactive flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-semibold">
                {p.name}{" "}
                <span className="font-mono-num text-xs text-ink/45">{p.code}</span>
              </p>
              <p className="font-mono-num text-xs text-ink/50">
                {p.role} · priority {p.priority} · success {p.successRate}%
                {p.lastHealth
                  ? ` · health ${new Date(p.lastHealth).toLocaleString("en-NG")}`
                  : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={p.isActive ? "primary" : "ghost"}
                onClick={() => patch(p.id, { isActive: !p.isActive })}
              >
                {p.isActive ? "Active" : "Inactive"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  patch(p.id, {
                    role: p.role === "PRIMARY" ? "FALLBACK" : "PRIMARY",
                  })
                }
              >
                Make {p.role === "PRIMARY" ? "fallback" : "primary"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      </Reveal>

      <Reveal delay={200}>
        <section>
          <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
            PROVIDER LOGS
          </h2>
          <ul className="surface max-h-80 divide-y divide-line overflow-y-auto">
            {logs.map((l) => (
              <li key={l.id} className="px-3 py-2 text-sm">
                <span className="font-mono-num text-xs text-ink/45">
                  {new Date(l.createdAt).toLocaleString("en-NG")}
                </span>{" "}
                <strong>{l.provider}</strong> {l.action}{" "}
                <span className={l.success ? "text-green" : "text-danger"}>
                  {l.success ? "OK" : "FAIL"}
                </span>
                {l.latencyMs != null && (
                  <span className="font-mono-num text-xs text-ink/40"> {l.latencyMs}ms</span>
                )}
                {l.error && <span className="block text-xs text-danger">{l.error}</span>}
              </li>
            ))}
            {logs.length === 0 && (
              <li className="px-3 py-6 text-sm text-ink/50">No logs yet</li>
            )}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
