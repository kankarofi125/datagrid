"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import { formatNaira } from "@/lib/money";

type KeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

export default function AgentPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("Production");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [volume, setVolume] = useState(0);
  const [threshold, setThreshold] = useState(500000);

  function load() {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then((d) => {
        setAllowed(Boolean(d.isAgent));
        setVolume(d.lifetimeVolume || 0);
        setThreshold(d.agentThreshold || 500000);
      });
    fetch("/api/agent/keys")
      .then((r) => r.json())
      .then((d) => {
        if (d.keys) setKeys(d.keys);
        if (d.error) setAllowed(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  function createKey() {
    start(async () => {
      setError(null);
      setRawKey(null);
      const res = await fetch("/api/agent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setRawKey(data.rawKey);
      load();
    });
  }

  function revoke(id: string) {
    start(async () => {
      await fetch(`/api/agent/keys?id=${id}`, { method: "DELETE" });
      load();
    });
  }

  if (allowed === null) {
    return <div className="p-8 text-sm text-ink/50">Loading…</div>;
  }

  if (!allowed) {
    return (
      <div className="px-4 py-8 lg:px-8">
        <h1 className="font-display text-3xl">AGENT DESK.</h1>
        <p className="mt-3 max-w-lg text-ink/65">
          Agent tier unlocks wholesale rates and the public reseller API. Current volume{" "}
          <span className="font-mono-num">{formatNaira(volume)}</span> / threshold{" "}
          <span className="font-mono-num">{formatNaira(threshold)}</span>.
        </p>
        <Link href="/referrals" className="mt-4 inline-block text-green">
          View progress →
        </Link>
      </div>
    );
  }

  const body = (
    <div className="space-y-6">
      <div className="surface border-green/30 bg-green/5 p-4 text-sm">
        You have agent access. Retail buys use wholesale rates automatically. Use API keys for
        automation.
      </div>

      <section className="surface p-5">
        <h2 className="font-mono-num text-[11px] tracking-widest text-ink/45">
          CREATE API KEY
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Input
            label="Label"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="sm:flex-1"
          />
          <div className="flex items-end">
            <Button onClick={createKey} disabled={pending}>
              Generate key
            </Button>
          </div>
        </div>
        {rawKey && (
          <div className="mt-4 rounded-lg border border-amber bg-amber/10 p-3">
            <p className="font-mono-num text-[10px] text-ink/60">
              COPY NOW — SHOWN ONCE
            </p>
            <p className="font-mono-num mt-1 break-all text-sm font-semibold">{rawKey}</p>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </section>

      <section>
        <h2 className="font-mono-num mb-2 text-[11px] tracking-widest text-ink/45">
          ACTIVE KEYS
        </h2>
        {keys.length === 0 ? (
          <p className="text-sm text-ink/50">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="font-semibold">{k.name}</p>
                  <p className="font-mono-num text-xs text-ink/50">{k.keyPrefix}…</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revoke(k.id)}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-deep p-5">
        <p className="font-mono-num text-[10px] tracking-widest text-amber">
          PUBLIC API · v1
        </p>
        <pre className="mt-3 overflow-x-auto font-mono-num text-[11px] leading-relaxed text-paper/80">
{`POST /api/public/v1/data
POST /api/public/v1/airtime
GET  /api/public/v1/status

Authorization: Bearer dg_live_…
Body: { "phone", "planId", "pin" }`}
        </pre>
      </section>
    </div>
  );

  return (
    <>
      <MobileOnly>
        <div className="space-y-5 px-4 py-6">
          <MotionMobileHeader kicker="RESELLER" title="AGENT." />
          <Reveal delay={100}>{body}</Reveal>
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="RESELLER CONSOLE"
            title="AGENT DESK."
            description="API keys, wholesale pricing, automation endpoints."
          />
          <Reveal delay={140}>
            <div className="max-w-2xl">{body}</div>
          </Reveal>
        </div>
      </DesktopOnly>
    </>
  );
}
