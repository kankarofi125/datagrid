/**
 * Sync the canonical DATA catalog (./data-plans.ts) into a live database
 * WITHOUT deletes: match on (network, sizeMb, validityDays, type) and
 * update in place, create missing rows, and deactivate stale rows so
 * transaction history keeps resolving.
 *
 * Usage: npx tsx prisma/sync-plans.ts
 */
import { PrismaClient } from "@prisma/client";
import { DATA_PLANS } from "./data-plans";

async function main() {
  const prisma = new PrismaClient();
  try {
    const networks = await prisma.network.findMany({ select: { id: true, code: true } });
    const networkId = new Map(networks.map((n) => [n.code, n.id]));
    for (const code of new Set(DATA_PLANS.map((p) => p.network))) {
      if (!networkId.has(code)) throw new Error(`Network missing in DB: ${code}`);
    }

    const seenIds: string[] = [];
    for (const [i, p] of DATA_PLANS.entries()) {
      const data = {
        name: p.name,
        retailPrice: p.retailPrice,
        resellerPrice: p.resellerPrice,
        providerCode: `ALR-${p.alrId}`,
        sortOrder: i,
        isActive: true,
      };
      const existing = await prisma.plan.findFirst({
        where: {
          networkId: networkId.get(p.network)!,
          sizeMb: p.sizeMb,
          validityDays: p.validityDays,
          type: p.type,
        },
        select: { id: true },
      });
      if (existing) {
        await prisma.plan.update({ where: { id: existing.id }, data });
        seenIds.push(existing.id);
        console.log(`updated ${p.network} ${p.name} (${p.type})`);
      } else {
        const created = await prisma.plan.create({
          data: {
            networkId: networkId.get(p.network)!,
            type: p.type,
            sizeMb: p.sizeMb,
            validityDays: p.validityDays,
            ...data,
          },
          select: { id: true },
        });
        seenIds.push(created.id);
        console.log(`created ${p.network} ${p.name} (${p.type})`);
      }
    }

    const stale = await prisma.plan.updateMany({
      where: { id: { notIn: seenIds }, isActive: true },
      data: { isActive: false },
    });
    console.log(`deactivated stale: ${stale.count}`);

    const active = await prisma.plan.count({ where: { isActive: true } });
    console.log(`active plans: ${active} (expected ${DATA_PLANS.length})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
