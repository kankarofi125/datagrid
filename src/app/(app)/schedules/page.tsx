"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import {
  detectNetwork,
  NETWORK_LABELS,
  toLocalPhone,
  type NetworkCode,
} from "@/lib/phone";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";
import { SkeletonPage } from "@/components/ui/Skeleton";

type Plan = {
  id: string;
  name: string;
  retailPrice: number;
  networkCode: NetworkCode;
};

type Schedule = {
  id: string;
  service: string;
  phone: string;
  planName?: string | null;
  amount: number | null;
  frequency: string;
  dayOfWeek: number | null;
  hourWat: number;
  minuteWat: number;
  nextRunAt: string;
  isActive: boolean;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<"DATA" | "AIRTIME">("DATA");
  const [planId, setPlanId] = useState("");
  const [amount, setAmount] = useState("500");
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState(5);
  const [hourWat, setHourWat] = useState(18);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const network = detectNetwork(phone);

  function load(isInitial = false) {
    if (isInitial) setLoading(true);
    Promise.all([
      fetch("/api/schedules").then((r) => r.json()),
      fetch("/api/catalog/plans").then((r) => r.json()),
    ])
      .then(([s, p]) => {
        setSchedules(s.schedules || []);
        setPlans(p.plans || []);
        if (p.plans?.[0]) setPlanId(p.plans[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => load(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const filteredPlans = network
    ? plans.filter((p) => p.networkCode === network)
    : plans;

  function create() {
    start(async () => {
      setError(null);
      setMsg(null);
      const local = toLocalPhone(phone);
      if (!local) {
        setError("Invalid phone");
        return;
      }
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          phone: local,
          planId: service === "DATA" ? planId : undefined,
          amount: service === "AIRTIME" ? Number(amount) : undefined,
          networkCode: network,
          frequency,
          dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : undefined,
          hourWat,
          minuteWat: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setMsg("Schedule created");
      load();
    });
  }

  function toggle(id: string, isActive: boolean) {
    start(async () => {
      await fetch("/api/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      load();
    });
  }

  function remove(id: string) {
    start(async () => {
      await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
      load();
    });
  }

  async function runNow() {
    start(async () => {
      setMsg(null);
      const res = await fetch("/api/schedules/run", { method: "POST" });
      const data = await res.json();
      setMsg(`Runner processed ${data.processed} due job(s)`);
      load();
    });
  }

  const form = (
    <div className="surface space-y-4 p-5">
      <p className="font-mono-num text-[10px] tracking-widest text-ink/45">
        NEW SCHEDULE · e.g. 1GB every Friday 6pm
      </p>
      <div className="flex gap-2">
        {(["DATA", "AIRTIME"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setService(s)}
            className={cn(
              "font-mono-num flex-1 rounded py-2 text-xs",
              service === s ? "bg-green text-white" : "border border-line"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <PhoneInput label="Phone" value={phone} onChange={setPhone} />
      {network && (
        <p className="text-xs text-ink/50">
          Network: {NETWORK_LABELS[network]}
        </p>
      )}
      {service === "DATA" ? (
        <div>
          <p className="font-mono-num mb-1 text-[11px] text-ink/50">PLAN</p>
          <select
            className="h-12 w-full rounded-md border border-line bg-paper px-3"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            {filteredPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatNaira(p.retailPrice, { compact: true })}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <Input
          label="Amount"
          mono
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      )}
      <div className="flex gap-2">
        {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFrequency(f)}
            className={cn(
              "font-mono-num flex-1 rounded py-2 text-[10px]",
              frequency === f ? "bg-green-deep text-paper" : "border border-line"
            )}
          >
            {f}
          </button>
        ))}
      </div>
      {frequency === "WEEKLY" && (
        <div className="flex flex-wrap gap-1">
          {DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setDayOfWeek(i)}
              className={cn(
                "font-mono-num rounded px-2 py-1 text-xs",
                dayOfWeek === i ? "bg-amber text-ink" : "border border-line"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}
      <label className="block text-sm">
        <span className="font-mono-num text-[11px] text-ink/50">HOUR (WAT)</span>
        <input
          type="number"
          min={0}
          max={23}
          className="font-mono-num mt-1 h-12 w-full rounded-md border border-line px-3"
          value={hourWat}
          onChange={(e) => setHourWat(Number(e.target.value))}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      {msg && <p className="text-sm text-green">{msg}</p>}
      <Button fullWidth onClick={create} disabled={pending}>
        Create schedule
      </Button>
    </div>
  );

  const list = (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-mono-num text-[11px] tracking-widest text-ink/45">
          ACTIVE · DUE RUNNER
        </h2>
        <Button size="sm" variant="ghost" onClick={runNow} disabled={pending}>
          Run due now
        </Button>
      </div>
      {schedules.length === 0 ? (
        <p className="text-sm text-ink/50">No schedules yet.</p>
      ) : (
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono-num text-[10px] text-ink/45">
                    {s.service} · {s.frequency}
                    {s.frequency === "WEEKLY" && s.dayOfWeek != null
                      ? ` · ${DAYS[s.dayOfWeek]}`
                      : ""}{" "}
                    · {String(s.hourWat).padStart(2, "0")}:00 WAT
                  </p>
                  <p className="mt-1 font-semibold">
                    {s.planName || (s.amount != null ? formatNaira(s.amount) : "—")} →{" "}
                    <span className="font-mono-num">{s.phone}</span>
                  </p>
                  <p className="font-mono-num mt-1 text-[11px] text-ink/50">
                    Next: {new Date(s.nextRunAt).toLocaleString("en-NG")}
                    {!s.isActive && " · PAUSED"}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="font-mono-num text-[10px] text-green"
                    onClick={() => toggle(s.id, s.isActive)}
                  >
                    {s.isActive ? "PAUSE" : "RESUME"}
                  </button>
                  <button
                    type="button"
                    className="font-mono-num text-[10px] text-danger"
                    onClick={() => remove(s.id)}
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  if (loading) {
    return <SkeletonPage variant="list" />;
  }

  return (
    <>
      <MobileOnly>
        <div className="space-y-6 px-4 py-6">
          <MotionMobileHeader kicker="AUTOMATION" title="SCHEDULES." />
          <Reveal delay={100}>{form}</Reveal>
          <Reveal delay={180}>{list}</Reveal>
        </div>
      </MobileOnly>
      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="AUTOMATION"
            title="SCHEDULED TOP-UPS."
            description="1GB every Friday at 6pm WAT — wallet debit when the runner fires."
          />
          <div className="grid max-w-5xl items-start gap-8 lg:grid-cols-2">
            <Reveal delay={120}>{form}</Reveal>
            <Reveal delay={200}>{list}</Reveal>
          </div>
        </div>
      </DesktopOnly>
    </>
  );
}
