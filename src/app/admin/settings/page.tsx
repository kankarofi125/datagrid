"use client";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/motion/Reveal";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string | number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings((d.settings || {}) as Record<string, string | number>))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function save() {
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            "referral.signup_bonus_ngn": Number(settings["referral.signup_bonus_ngn"] || 0),
            "referral.purchase_pct_bps": Number(settings["referral.purchase_pct_bps"] || 0),
            "referral.window_months": Number(settings["referral.window_months"] || 12),
            "agent.volume_threshold_ngn": Number(
              settings["agent.volume_threshold_ngn"] || 500000
            ),
            "support.whatsapp": String(settings["support.whatsapp"] || ""),
            "brand.cac_rc": String(settings["brand.cac_rc"] || ""),
          },
        }),
      });
      if (res.ok) setMsg("Settings saved");
      else setMsg("Save failed");
    });
  }

  function field(key: string, label: string) {
    return (
      <Input
        key={key}
        label={label}
        mono
        value={String(settings[key] ?? "")}
        onChange={(e) =>
          setSettings((s) => ({
            ...s,
            [key]: e.target.value,
          }))
        }
      />
    );
  }

  if (loading) {
    return <SkeletonPage variant="form" />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader kicker="PLATFORM" title="SETTINGS." />
      <div className="max-w-md space-y-3 surface p-5">
        {field("referral.signup_bonus_ngn", "Referral signup bonus (₦)")}
        {field("referral.purchase_pct_bps", "Purchase commission (bps, 50 = 0.5%)")}
        {field("referral.window_months", "Referral window (months)")}
        {field("agent.volume_threshold_ngn", "Agent volume threshold (₦)")}
        {field("support.whatsapp", "WhatsApp (234…)")}
        {field("brand.cac_rc", "CAC RC")}
        <Button fullWidth onClick={save} disabled={pending}>
          Save
        </Button>
        {msg && <p className="text-sm text-green">{msg}</p>}
      </div>
    </div>
  );
}
