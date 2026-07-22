"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-grid-paper">
      <TopUtilityStrip />

      {/* Mobile */}
      <div className="mx-auto w-full max-w-md px-4 py-10 lg:hidden">
        <HeroEnter delay={0}>
          <p className="font-mono-num text-[10px] tracking-[0.2em] text-green">
            STAFF ACCESS
          </p>
        </HeroEnter>
        <HeroEnter delay={60}>
          <h1 className="font-display mt-2 text-3xl text-ink">ADMIN ERP.</h1>
        </HeroEnter>
        <HeroEnter delay={100}>
          <p className="mt-2 text-sm text-ink/55">
            Username and password for the control room. Not for end-user lines.
          </p>
        </HeroEnter>
        <Reveal delay={140}>
          <form onSubmit={submit} className="surface mt-6 space-y-4 p-5">
            <Input
              label="Username"
              mono
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <Button fullWidth size="lg" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Enter ERP"}
            </Button>
          </form>
        </Reveal>
        <p className="font-mono-num mt-6 text-center text-[10px] text-ink/35">
          <Link href="/login" className="text-green">
            ← Operator login
          </Link>
        </p>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden min-h-[calc(100vh-3rem)] max-w-6xl lg:grid lg:grid-cols-2">
        <div className="bg-grid bg-grid-live flex flex-col justify-between p-12 text-paper">
          <Link href="/" className="font-display text-2xl text-amber">
            DATAGRID
          </Link>
          <div>
            <p className="font-mono-num text-[11px] tracking-[0.2em] text-amber">
              ENTERPRISE RESOURCE PLANNING
            </p>
            <h1 className="font-display mt-4 text-5xl leading-none">
              COMMAND
              <br />
              CENTER.
            </h1>
            <p className="mt-4 max-w-sm text-paper/65">
              Analytics, users, transactions, services, gateways, and integrations —
              dual-pane operator desk for staff only.
            </p>
          </div>
          <p className="font-mono-num text-[11px] text-paper/40">
            DEMO · admin / admin1234
          </p>
        </div>
        <div className="flex flex-col justify-center bg-paper p-12">
          <h2 className="font-display text-3xl text-ink">SIGN IN.</h2>
          <p className="mt-2 text-ink/55">Staff credentials for /admin ERP.</p>
          <form onSubmit={submit} className="surface mt-8 max-w-sm space-y-4 p-6">
            <Input
              label="Username"
              mono
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            <Button fullWidth size="lg" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Enter ERP"}
            </Button>
          </form>
          <Link
            href="/login"
            className="font-mono-num mt-6 text-[11px] tracking-wide text-ink/40 hover:text-green"
          >
            ← Operator phone login
          </Link>
        </div>
      </div>
    </div>
  );
}
