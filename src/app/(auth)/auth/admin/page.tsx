"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const canSubmit = username.trim().length > 0 && password.length > 0 && !pending;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    start(async () => {
      setError(null);

      try {
        const response = await fetch("/api/auth/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(
            response.status >= 500
              ? "Staff sign-in is temporarily unavailable. Please try again."
              : data.error || "We could not verify those credentials."
          );
          return;
        }

        router.replace("/admin");
        router.refresh();
      } catch {
        setError("Could not reach the secure gateway. Check your connection and retry.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AdminAccessHeader />

      <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-[1600px] lg:grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)]">
        <section className="bg-grid bg-grid-live relative hidden overflow-hidden text-paper lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div
            className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-white/[0.06]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border border-amber/15"
            aria-hidden
          />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono-num text-[9px] font-semibold uppercase tracking-[0.16em] text-amber">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber" />
              Restricted system
            </span>
          </div>

          <div className="relative max-w-xl py-12">
            <p className="font-mono-num text-[10px] font-semibold uppercase tracking-[0.2em] text-amber">
              DataGrid operations
            </p>
            <h1 className="mt-5 max-w-lg text-[52px] font-semibold leading-[0.98] tracking-[-0.045em] xl:text-[64px]">
              The grid moves from here.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-paper/62">
              Monitor delivery, approve sensitive actions, protect margins and keep
              every service lane operational.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <SecurityFeature
                index="01"
                title="Live operations"
                description="Orders and providers"
              />
              <SecurityFeature
                index="02"
                title="Dual approval"
                description="Protected wallet actions"
              />
              <SecurityFeature
                index="03"
                title="Audit trail"
                description="Every change recorded"
              />
            </div>
          </div>

          <div className="relative flex items-end justify-between gap-6 border-t border-white/10 pt-5">
            <div>
              <p className="font-mono-num text-[8px] uppercase tracking-[0.18em] text-paper/35">
                Security posture
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-paper/75">
                <span className="h-1.5 w-1.5 rounded-full bg-[#58d68d]" />
                Role protected · Session encrypted
              </p>
            </div>
            <p className="font-mono-num text-[8px] uppercase tracking-[0.16em] text-paper/28">
              Staff console
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-8 lg:bg-paper lg:px-12 lg:py-12 xl:px-20">
          <div className="w-full max-w-[440px]">
            <div className="mb-7">
              <div className="mb-5 flex items-center justify-between lg:hidden">
                <span className="inline-flex items-center gap-2 rounded-full border border-green/15 bg-green/5 px-3 py-1.5 font-mono-num text-[9px] font-semibold uppercase tracking-[0.14em] text-green">
                  <span className="h-1.5 w-1.5 rounded-full bg-green" />
                  Secure staff gateway
                </span>
                <span className="font-mono-num text-[9px] tracking-wider text-ink/30">
                  AUTH / 01
                </span>
              </div>

              <p className="hidden font-mono-num text-[10px] font-semibold uppercase tracking-[0.18em] text-green lg:block">
                Auth / Staff
              </p>
              <h2 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.035em] sm:text-[38px]">
                Welcome back.
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/52">
                Sign in with your assigned staff username and password to enter the
                operations console.
              </p>
            </div>

            <form
              onSubmit={submit}
              className="rounded-[22px] border border-line bg-white p-5 shadow-[0_24px_60px_-42px_rgba(14,33,26,.62)] sm:p-6"
              aria-busy={pending}
              noValidate
            >
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-deep text-amber">
                    <LockIcon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Administrator sign in</p>
                    <p className="mt-0.5 text-xs text-ink/42">Authorized personnel only</p>
                  </div>
                </div>
                <span className="font-mono-num text-[8px] font-semibold uppercase tracking-[0.15em] text-green">
                  TLS
                </span>
              </div>

              <div className="space-y-4">
                <CredentialField
                  id="admin-username"
                  label="Staff username"
                  value={username}
                  onChange={(value) => {
                    setUsername(value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter username"
                  autoComplete="username"
                  icon={<UserIcon />}
                  autoFocus
                  invalid={Boolean(error)}
                  maxLength={64}
                />

                <CredentialField
                  id="admin-password"
                  label="Password"
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  icon={<KeyIcon />}
                  invalid={Boolean(error)}
                  maxLength={256}
                  onKeyState={setCapsLock}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="flex h-8 min-w-12 items-center justify-center rounded-lg px-2 text-[11px] font-semibold text-ink/42 transition hover:bg-ink/[0.04] hover:text-ink"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  }
                />
              </div>

              <div className="min-h-8 pt-2" aria-live="polite">
                {capsLock && !error && (
                  <p className="flex items-center gap-2 text-xs font-medium text-[#9a6316]">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                    Caps Lock is on
                  </p>
                )}
                {error && (
                  <div
                    className="flex items-start gap-2.5 rounded-xl border border-danger/15 bg-danger/[0.055] px-3 py-2.5 text-sm text-danger"
                    role="alert"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-danger/35 text-[10px] font-bold">
                      !
                    </span>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="pressable mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-green text-[15px] font-bold text-white shadow-[0_12px_24px_-16px_rgba(22,134,83,.85)] transition hover:bg-[#117548] disabled:pointer-events-none disabled:opacity-45"
              >
                {pending ? (
                  <>
                    <Spinner />
                    Verifying access…
                  </>
                ) : (
                  <>
                    Enter operations
                    <span aria-hidden>→</span>
                  </>
                )}
              </button>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-ink/38">
                Successful sign-ins and administrative actions are recorded for security.
              </p>
            </form>

            <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs sm:flex-row">
              <p className="text-ink/42">
                Need staff access?{" "}
                <Link href="/support" className="font-semibold text-green hover:underline">
                  Contact support
                </Link>
              </p>
              <Link
                href="/login"
                className="font-mono-num font-semibold uppercase tracking-[0.1em] text-ink/42 transition hover:text-green"
              >
                Operator login →
              </Link>
            </div>

            <div className="mt-7 rounded-2xl border border-line bg-white/55 p-3.5 lg:hidden">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green/8 text-green">
                  <ShieldIcon />
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink/72">Protected operations</p>
                  <p className="mt-0.5 text-[11px] text-ink/40">
                    Role checks, encrypted sessions and audit logging are active.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AdminAccessHeader() {
  return (
    <header className="relative z-10 border-b border-line bg-paper/94 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="DataGrid home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber font-display text-xs text-[#2c1b02]">
            DG
          </span>
          <span>
            <span className="block font-display text-base tracking-wide text-ink">DATAGRID</span>
            <span className="block font-mono-num text-[7px] uppercase tracking-[0.18em] text-ink/35">
              Staff access
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 font-mono-num text-[8px] font-semibold uppercase tracking-[0.16em] text-ink/30 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-green" />
            Secure gateway
          </span>
          <Link
            href="/login"
            className="flex h-9 items-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink/58 shadow-sm transition hover:border-green/25 hover:text-green"
          >
            Customer sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function CredentialField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  type = "text",
  icon,
  trailing,
  autoFocus,
  invalid,
  maxLength,
  onKeyState,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  type?: "text" | "password";
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  autoFocus?: boolean;
  invalid?: boolean;
  maxLength: number;
  onKeyState?: (capsLock: boolean) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/52"
      >
        {label}
      </label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink/30">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => onKeyState?.(event.getModifierState("CapsLock"))}
          onKeyUp={(event) => onKeyState?.(event.getModifierState("CapsLock"))}
          onBlur={() => onKeyState?.(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={invalid}
          required
          maxLength={maxLength}
          className={cn(
            "h-12 w-full rounded-[14px] border bg-[#fbfaf7] pl-11 text-[15px] text-ink outline-none transition placeholder:text-ink/25",
            trailing ? "pr-[72px]" : "pr-3.5",
            invalid
              ? "border-danger/40 focus:border-danger focus:ring-2 focus:ring-danger/8"
              : "border-line hover:border-ink/18 focus:border-green focus:ring-2 focus:ring-green/10"
          )}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>
        )}
      </div>
    </div>
  );
}

function SecurityFeature({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3.5">
      <p className="font-mono-num text-[8px] font-semibold tracking-[0.14em] text-amber">
        {index}
      </p>
      <p className="mt-3 text-xs font-semibold text-paper/90">{title}</p>
      <p className="mt-1 text-[10px] leading-relaxed text-paper/38">{description}</p>
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <rect x="5" y="10" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 20c.8-3.8 3.2-5.7 7-5.7s6.2 1.9 7 5.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" aria-hidden>
      <circle cx="8" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="m11.5 10.5 8-4M16 8.3l1.4 2.5M18.4 7l1.4 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path d="M12 3 5 6v5c0 4.7 2.6 8 7 10 4.4-2 7-5.3 7-10V6l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
      aria-hidden
    />
  );
}
