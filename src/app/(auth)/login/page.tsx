"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { TopUtilityStrip } from "@/components/layout/TopUtilityStrip";
import { HeroEnter, Reveal } from "@/components/motion/Reveal";
import { sanitizeNgPhoneInput } from "@/lib/phone";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState(() =>
    sanitizeNgPhoneInput(params.get("phone") || "")
  );
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);
  const [pending, start] = useTransition();

  function requestCode() {
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({} as { error?: string; cooldownSec?: number; devHint?: string }));
      if (!res.ok) {
        setError(data.error || "Could not send code. Check server database config.");
        if (data.cooldownSec) setCooldown(data.cooldownSec);
        return;
      }
      setDevHint(data.devHint);
      setStep("otp");
    });
  }

  function verify() {
    start(async () => {
      setError(null);
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          referral: params.get("ref") || undefined,
        }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  const form = (
    <div className="space-y-4">
      {step === "phone" ? (
        <>
          <PhoneInput value={phone} onChange={setPhone} />
          <Button fullWidth size="lg" onClick={requestCode} disabled={pending}>
            Send OTP
          </Button>
        </>
      ) : (
        <>
          <Input
            label="OTP code"
            placeholder="1234"
            inputMode="numeric"
            mono
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            hint={devHint ? `Dev code: ${devHint}` : `Sent to ${phone}`}
          />
          <Button fullWidth size="lg" onClick={verify} disabled={pending || code.length < 4}>
            Verify & enter
          </Button>
          <button
            type="button"
            className="font-mono-num w-full text-center text-xs tracking-wide text-ink/50"
            onClick={() => setStep("phone")}
          >
            Change number
          </button>
        </>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
          {cooldown > 0 ? ` (${cooldown}s)` : ""}
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="mx-auto w-full max-w-md px-4 py-12 lg:hidden">
        <HeroEnter delay={0}>
          <Link href="/" className="font-display text-2xl text-ink">
            DATAGRID
          </Link>
        </HeroEnter>
        <HeroEnter delay={80}>
          <h1 className="font-display mt-8 text-4xl text-ink">
            {step === "phone" ? "ENTER YOUR LINE." : "FOUR DIGITS."}
          </h1>
        </HeroEnter>
        <HeroEnter delay={140}>
          <p className="mt-2 text-ink/60">
            Phone-first login. OTP via Termii in production — sim code in dev.
          </p>
        </HeroEnter>
        <Reveal delay={200}>
          <div className="surface mt-8 p-5">{form}</div>
        </Reveal>
        <HeroEnter delay={260}>
          <p className="font-mono-num mt-10 text-[11px] text-ink/40">
            DEMO · 08030000000 · OTP 1234 · PIN 1234
          </p>
        </HeroEnter>
      </div>

      <div className="mx-auto hidden min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden lg:grid lg:grid-cols-2">
        <div className="bg-grid bg-grid-live flex flex-col justify-between p-12 text-paper">
          <HeroEnter delay={0}>
            <Link href="/" className="font-display text-2xl text-amber">
              DATAGRID
            </Link>
          </HeroEnter>
          <div>
            <HeroEnter delay={100}>
              <p className="font-mono-num text-[11px] tracking-[0.2em] text-amber">
                ACCESS CONTROL
              </p>
            </HeroEnter>
            <HeroEnter delay={160}>
              <h1 className="font-display mt-4 text-6xl leading-none">
                ENTER
                <br />
                THE GRID.
              </h1>
            </HeroEnter>
            <HeroEnter delay={240}>
              <p className="mt-4 max-w-sm text-paper/65">
                Phone-first auth for operators and agents. Wallet, VTU, and reseller tools behind
                this gate.
              </p>
            </HeroEnter>
          </div>
          <HeroEnter delay={300}>
            <p className="font-mono-num text-[11px] text-paper/40">
              DEMO · 08030000000 · OTP 1234
            </p>
          </HeroEnter>
        </div>
        <div className="flex flex-col justify-center bg-paper p-12">
          <HeroEnter delay={120}>
            <h2 className="font-display text-4xl text-ink">
              {step === "phone" ? "YOUR LINE." : "OTP."}
            </h2>
          </HeroEnter>
          <HeroEnter delay={180}>
            <p className="mt-2 text-ink/60">Nigerian mobile number · OTP in under a minute.</p>
          </HeroEnter>
          <Reveal delay={240}>
            <div className="surface mt-8 max-w-sm p-6">{form}</div>
          </Reveal>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-grid-paper">
      <TopUtilityStrip />
      <Suspense fallback={<div className="p-8">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
