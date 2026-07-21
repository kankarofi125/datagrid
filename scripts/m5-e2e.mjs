import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const base = "http://localhost:3000";

async function session() {
  const cookies = [];
  return {
    async fetch(url, init = {}) {
      const headers = new Headers(init.headers || {});
      if (cookies.length) {
        headers.set(
          "cookie",
          cookies.map((c) => String(c).split(";")[0]).join("; ")
        );
      }
      const res = await fetch(url, { ...init, headers });
      const set = typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
      for (const c of set) cookies.push(c);
      const raw = res.headers.get("set-cookie");
      if (raw && !set.length) cookies.push(raw);
      return res;
    },
  };
}

async function login(s, phone) {
  await s.fetch(`${base}/api/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  return s.fetch(`${base}/api/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code: "1234" }),
  });
}

async function main() {
  // Ensure admin exists and is ADMIN
  await prisma.user.update({
    where: { phone: "+2348000000001" },
    data: { role: "ADMIN" },
  });

  const admin = await session();
  await login(admin, "08000000001");

  const analytics = await (await admin.fetch(`${base}/api/admin/analytics`)).json();
  console.log("analytics gmv", analytics.gmv, "orders", analytics.orders, "users", analytics.users);

  const plans = await (await admin.fetch(`${base}/api/admin/plans`)).json();
  const plan = plans.plans?.[0];
  if (plan) {
    const patch = await (
      await admin.fetch(`${base}/api/admin/plans`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plan.id,
          retailPrice: plan.retailPrice,
          resellerPrice: plan.resellerPrice,
        }),
      })
    ).json();
    console.log("plan patch", patch.ok);
  }

  const credit = await (
    await admin.fetch(`${base}/api/admin/wallets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: "08030000000",
        amount: 500,
        reason: "M5 test credit",
      }),
    })
  ).json();
  console.log("credit request", credit.ok, credit.request?.id);

  // Force approve as same admin (dev)
  const approve = await (
    await admin.fetch(`${base}/api/admin/wallets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: credit.request.id,
        decision: "APPROVE",
        force: true,
      }),
    })
  ).json();
  console.log("credit approve", approve.ok, approve.orderRef, approve.balance);

  const providers = await (
    await admin.fetch(`${base}/api/admin/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "health" }),
    })
  ).json();
  console.log("provider health", providers.ok);

  const audit = await (await admin.fetch(`${base}/api/admin/audit`)).json();
  console.log("audit logs", audit.logs?.length);

  // non-admin blocked
  const user = await session();
  await login(user, "08030000000");
  const denied = await user.fetch(`${base}/api/admin/analytics`);
  console.log("user admin denied", denied.status);

  console.log("M5 e2e ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
