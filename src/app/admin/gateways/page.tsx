"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { MobileOnly, DesktopOnly } from "@/components/layout/Responsive";
import { cn } from "@/lib/cn";

type Gateway = {
  key: string;
  code: string;
  name: string;
  enabled: boolean;
  mode: string;
  envConfigured: boolean;
  paymentMode: string;
};

export default function AdminGatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [paymentMode, setPaymentMode] = useState("simulate");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const load = useCallback(() => {
    fetch("/api/admin/gateways")
      .then((r) => r.json())
      .then((d) => {
        setGateways(d.gateways || []);
        setPaymentMode(d.paymentMode || "simulate");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(g: Gateway) {
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/admin/gateways", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: g.key, enabled: !g.enabled }),
      });
      if (!res.ok) {
        setMsg("Update failed");
        return;
      }
      setMsg(`${g.name} ${!g.enabled ? "enabled" : "disabled"}`);
      load();
    });
  }

  if (loading) {
    return <SkeletonPage variant="admin" />;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        kicker="INTEGRATIONS"
        title="PAYMENT GATEWAYS."
        description="Paystack, Flutterwave, Monnify — toggles store in settings; secrets stay in env."
      />

      <div className="rounded-xl border border-line bg-paper px-3 py-2.5">
        <p className="font-mono-num text-[9px] text-ink/40">RUNTIME PAYMENT_MODE</p>
        <p className="font-mono-num mt-0.5 text-sm font-semibold text-ink">{paymentMode}</p>
      </div>

      {msg && <p className="text-xs text-green">{msg}</p>}

      <MobileOnly>
        <ul className="space-y-2">
          {gateways.map((g) => (
            <li key={g.key} className="rounded-xl border border-line bg-paper p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{g.name}</p>
                  <p className="font-mono-num mt-0.5 text-[9px] text-ink/45">
                    {g.envConfigured ? "ENV KEYS SET" : "NO ENV KEYS"} · {g.mode}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono-num rounded-full px-2 py-0.5 text-[9px]",
                    g.enabled ? "bg-green/10 text-green" : "bg-ink/5 text-ink/40"
                  )}
                >
                  {g.enabled ? "ON" : "OFF"}
                </span>
              </div>
              <Button
                size="sm"
                className="mt-2 w-full"
                variant={g.enabled ? "secondary" : "primary"}
                disabled={pending}
                onClick={() => toggle(g)}
              >
                {g.enabled ? "Disable" : "Enable"}
              </Button>
            </li>
          ))}
        </ul>
      </MobileOnly>

      <DesktopOnly>
        <div className="grid gap-4 md:grid-cols-3">
          {gateways.map((g) => (
            <div key={g.key} className="surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-xl text-ink">{g.name.toUpperCase()}.</p>
                  <p className="font-mono-num mt-2 text-[11px] text-ink/50">
                    CODE · {g.code}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-mono-num rounded-full px-2.5 py-1 text-[10px]",
                    g.enabled ? "bg-green/10 text-green" : "bg-ink/5 text-ink/40"
                  )}
                >
                  {g.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
              <ul className="mt-4 space-y-1 font-mono-num text-[11px] text-ink/55">
                <li>ENV: {g.envConfigured ? "configured" : "missing keys"}</li>
                <li>MODE: {g.mode}</li>
              </ul>
              <Button
                className="mt-5 w-full"
                variant={g.enabled ? "secondary" : "primary"}
                disabled={pending}
                onClick={() => toggle(g)}
              >
                {g.enabled ? "Disable gateway" : "Enable gateway"}
              </Button>
            </div>
          ))}
        </div>
      </DesktopOnly>
    </div>
  );
}
