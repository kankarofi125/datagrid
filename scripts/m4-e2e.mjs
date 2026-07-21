import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const base = "http://localhost:3000";

async function jar() {
  const cookies = [];
  return {
    async fetch(url, init = {}) {
      const headers = new Headers(init.headers || {});
      if (cookies.length) headers.set("cookie", cookies.map((c) => c.split(";")[0]).join("; "));
      const res = await fetch(url, { ...init, headers });
      const set = res.headers.getSetCookie?.() || [];
      for (const c of set) cookies.push(c);
      // fallback: node may not have getSetCookie
      const raw = res.headers.get("set-cookie");
      if (raw && !set.length) cookies.push(raw);
      return res;
    },
  };
}

async function main() {
  await prisma.user.update({
    where: { phone: "+2348030000000" },
    data: { role: "AGENT", agentSince: new Date(), lifetimeVolume: 600000 },
  });
  console.log("promoted AGENT");

  const s = await jar();
  await s.fetch(`${base}/api/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "08030000000" }),
  });
  await s.fetch(`${base}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "08030000000", code: "1234" }),
  });

  const ref = await (await s.fetch(`${base}/api/referrals`)).json();
  console.log("referrals", ref.role, ref.isAgent, ref.referralCode);

  const keyRes = await (
    await s.fetch(`${base}/api/agent/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "E2E" }),
    })
  ).json();
  console.log("key", keyRes.ok, keyRes.key?.keyPrefix);
  const raw = keyRes.rawKey;
  if (!raw) {
    console.error("no raw key", keyRes);
    process.exit(1);
  }

  await s.fetch(`${base}/api/wallet/fund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 10000, method: "paystack" }),
  });

  const plans = await (await fetch(`${base}/api/catalog/plans`)).json();
  const planId = plans.plans[0].id;

  const buy = await (
    await fetch(`${base}/api/public/v1/data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${raw}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: "08034567890", planId, pin: "1234" }),
    })
  ).json();
  console.log("public data", buy.ok, buy.orderRef, buy.amount, buy.balance);

  const status = await (
    await fetch(`${base}/api/public/v1/status`, {
      headers: { Authorization: `Bearer ${raw}` },
    })
  ).json();
  console.log("public status bal", status.balance, status.role);

  const sched = await (
    await s.fetch(`${base}/api/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "DATA",
        phone: "08034567890",
        planId,
        frequency: "WEEKLY",
        dayOfWeek: 5,
        hourWat: 18,
      }),
    })
  ).json();
  console.log("schedule", sched.schedule?.id, sched.schedule?.nextRunAt);

  await prisma.scheduledTopUp.updateMany({
    data: { nextRunAt: new Date(Date.now() - 1000), isActive: true },
  });

  const run = await (
    await fetch(`${base}/api/schedules/run`, { method: "POST" })
  ).json();
  console.log("run", run.processed, JSON.stringify(run.results));

  // referred user
  const s2 = await jar();
  await s2.fetch(`${base}/api/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "08031112222" }),
  });
  await s2.fetch(`${base}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: "08031112222",
      code: "1234",
      referral: ref.referralCode,
    }),
  });
  await s2.fetch(`${base}/api/auth/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "1234" }),
  });
  await s2.fetch(`${base}/api/wallet/fund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 2000, method: "paystack" }),
  });

  const ref2 = await (await s.fetch(`${base}/api/referrals`)).json();
  console.log(
    "after bonus",
    "comm",
    ref2.commissionBalance,
    "earned",
    ref2.totalEarned,
    "refs",
    ref2.referrals?.length
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
