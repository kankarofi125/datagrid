import { PrismaClient, PlanType, BillerCategory, ProviderRole, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_PREFIXES } from "../src/lib/phone";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding DataGrid…");

  // Networks
  const networkDefs = [
    { code: "MTN", name: "MTN", color: "#FFCC00", ussdBalance: "*323#", sortOrder: 1 },
    { code: "GLO", name: "Glo", color: "#3DAE2B", ussdBalance: "*127*0#", sortOrder: 2 },
    { code: "AIRTEL", name: "Airtel", color: "#E4002B", ussdBalance: "*140#", sortOrder: 3 },
    { code: "NINEMOBILE", name: "9mobile", color: "#00A94F", ussdBalance: "*232#", sortOrder: 4 },
  ];

  const networks: Record<string, string> = {};
  for (const n of networkDefs) {
    const row = await prisma.network.upsert({
      where: { code: n.code },
      update: { name: n.name, color: n.color, ussdBalance: n.ussdBalance },
      create: { ...n, status: "OPERATIONAL", uptimePct: 99.5 },
    });
    networks[n.code] = row.id;
  }

  // Prefixes
  for (const [code, prefixes] of Object.entries(DEFAULT_PREFIXES)) {
    for (const prefix of prefixes) {
      await prisma.phonePrefix.upsert({
        where: { prefix },
        update: { networkId: networks[code] },
        create: { prefix, networkId: networks[code] },
      });
    }
  }

  // Plans
  const plans: {
    network: string;
    type: PlanType;
    name: string;
    sizeMb: number;
    validityDays: number;
    retailPrice: number;
    resellerPrice: number;
  }[] = [
    { network: "MTN", type: "SME", name: "1GB SME", sizeMb: 1024, validityDays: 30, retailPrice: 400, resellerPrice: 360 },
    { network: "MTN", type: "SME", name: "2GB SME", sizeMb: 2048, validityDays: 30, retailPrice: 750, resellerPrice: 690 },
    { network: "MTN", type: "SME", name: "5GB SME", sizeMb: 5120, validityDays: 30, retailPrice: 1800, resellerPrice: 1680 },
    { network: "MTN", type: "GIFTING", name: "1.5GB Gifting", sizeMb: 1536, validityDays: 30, retailPrice: 550, resellerPrice: 510 },
    { network: "MTN", type: "RETAIL", name: "1GB Retail", sizeMb: 1024, validityDays: 30, retailPrice: 500, resellerPrice: 470 },
    { network: "GLO", type: "GIFTING", name: "1GB Gifting", sizeMb: 1024, validityDays: 14, retailPrice: 450, resellerPrice: 410 },
    { network: "GLO", type: "SME", name: "2GB SME", sizeMb: 2048, validityDays: 30, retailPrice: 900, resellerPrice: 840 },
    { network: "AIRTEL", type: "RETAIL", name: "1.5GB Retail", sizeMb: 1536, validityDays: 30, retailPrice: 500, resellerPrice: 460 },
    { network: "AIRTEL", type: "SME", name: "3GB SME", sizeMb: 3072, validityDays: 30, retailPrice: 1200, resellerPrice: 1120 },
    { network: "NINEMOBILE", type: "SME", name: "1GB SME", sizeMb: 1024, validityDays: 30, retailPrice: 400, resellerPrice: 365 },
    { network: "NINEMOBILE", type: "GIFTING", name: "2GB Gifting", sizeMb: 2048, validityDays: 30, retailPrice: 850, resellerPrice: 790 },
  ];

  await prisma.plan.deleteMany();
  for (const [i, p] of plans.entries()) {
    await prisma.plan.create({
      data: {
        networkId: networks[p.network],
        type: p.type,
        name: p.name,
        sizeMb: p.sizeMb,
        validityDays: p.validityDays,
        retailPrice: p.retailPrice,
        resellerPrice: p.resellerPrice,
        providerCode: `${p.network}_${p.sizeMb}_${p.type}`,
        sortOrder: i,
      },
    });
  }

  // Billers
  const discos = [
    "AEDC", "BEDC", "EEDC", "EKEDC", "IBEDC", "IKEDC", "JEDC", "KAEDCO", "KEDCO", "PHED", "YEDC",
  ];
  for (const code of discos) {
    await prisma.biller.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
        category: BillerCategory.ELECTRICITY,
        validateType: "METER_11",
      },
    });
  }

  const cable = [
    { code: "DSTV", name: "DStv", packages: [{ code: "PADI", name: "Padi", amount: 2950 }, { code: "YANGA", name: "Yanga", amount: 4200 }] },
    { code: "GOTV", name: "GOtv", packages: [{ code: "JOLLI", name: "Jolli", amount: 3300 }] },
    { code: "STARTIMES", name: "Startimes", packages: [{ code: "NOVA", name: "Nova", amount: 2100 }] },
    { code: "SHOWMAX", name: "Showmax", packages: [{ code: "MOBILE", name: "Mobile", amount: 1450 }] },
  ];
  for (const c of cable) {
    const b = await prisma.biller.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        category: BillerCategory.CABLE,
        validateType: "IUC",
      },
    });
    for (const [i, pkg] of c.packages.entries()) {
      await prisma.billerPackage.upsert({
        where: { billerId_code: { billerId: b.id, code: pkg.code } },
        update: { amount: pkg.amount, name: pkg.name },
        create: {
          billerId: b.id,
          code: pkg.code,
          name: pkg.name,
          amount: pkg.amount,
          resellerPrice: pkg.amount - 50,
          sortOrder: i,
        },
      });
    }
  }

  for (const code of ["WAEC", "NECO", "NABTEB"]) {
    const b = await prisma.biller.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: code,
        category: BillerCategory.EXAM,
        validateType: "NONE",
      },
    });
    await prisma.billerPackage.upsert({
      where: { billerId_code: { billerId: b.id, code: "RESULT" } },
      update: {},
      create: {
        billerId: b.id,
        code: "RESULT",
        name: `${code} Result Checker`,
        amount: code === "WAEC" ? 3500 : 1500,
      },
    });
  }

  // Providers
  // Lower priority number = tried first. Without live keys adapters use sim internally.
  await prisma.provider.upsert({
    where: { code: "VTPASS" },
    update: { isActive: true, priority: 10, role: ProviderRole.PRIMARY },
    create: {
      code: "VTPASS",
      name: "VTpass",
      role: ProviderRole.PRIMARY,
      priority: 10,
      isActive: true,
    },
  });
  await prisma.provider.upsert({
    where: { code: "CLUBKONNECT" },
    update: { isActive: true, priority: 20, role: ProviderRole.FALLBACK },
    create: {
      code: "CLUBKONNECT",
      name: "ClubKonnect",
      role: ProviderRole.FALLBACK,
      priority: 20,
      isActive: true,
    },
  });
  await prisma.provider.upsert({
    where: { code: "SIMULATOR" },
    update: { isActive: true, priority: 100, role: ProviderRole.FALLBACK },
    create: {
      code: "SIMULATOR",
      name: "DataGrid Simulator",
      role: ProviderRole.FALLBACK,
      priority: 100,
      isActive: true,
    },
  });

  // Settings
  const settings: Record<string, unknown> = {
    "referral.signup_bonus_ngn": 100,
    "referral.purchase_pct_bps": 50,
    "referral.window_months": 12,
    "agent.volume_threshold_ngn": 500000,
    "kyc.limits": {
      T0: { daily: 50000, monthly: 200000 },
      T1: { daily: 200000, monthly: 1000000 },
      T2: { daily: 1000000, monthly: 5000000 },
      T3: { daily: 5000000, monthly: 20000000 },
    },
    "ticker.items": [
      "MTN 1GB SME ₦400",
      "GLO 2GB ₦900",
      "DSTV PADI ₦2,950",
      "IKEDC TOKEN INSTANT",
      "AIRTEL 1.5GB ₦500",
    ],
    "airtime_to_cash.rates": { MTN: 0.75, GLO: 0.7, AIRTEL: 0.72, NINEMOBILE: 0.7 },
    "support.whatsapp": "2348000000000",
    "brand.cac_rc": "RC ————",
    "brand.ndpr_url": "/legal/privacy",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }

  // Demo admin + demo user
  const adminPhone = "+2348000000001";
  const userPhone = "+2348030000000";
  const pinHash = await bcrypt.hash("1234", 10);

  const adminPasswordHash = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      username: "admin",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      name: "DataGrid Admin",
    },
    create: {
      phone: adminPhone,
      phoneLocal: "08000000001",
      name: "DataGrid Admin",
      role: UserRole.ADMIN,
      username: "admin",
      passwordHash: adminPasswordHash,
      referralCode: "DGADMIN",
      pinHash,
    },
  });
  await prisma.wallet.upsert({
    where: { userId_kind: { userId: admin.id, kind: "MAIN" } },
    update: { balance: 500000 },
    create: { userId: admin.id, kind: "MAIN", balance: 500000 },
  });
  await prisma.wallet.upsert({
    where: { userId_kind: { userId: admin.id, kind: "COMMISSION" } },
    update: {},
    create: { userId: admin.id, kind: "COMMISSION", balance: 0 },
  });

  const user = await prisma.user.upsert({
    where: { phone: userPhone },
    update: {},
    create: {
      phone: userPhone,
      phoneLocal: "08030000000",
      name: "Demo User",
      role: UserRole.USER,
      referralCode: "DEMOUSER",
      pinHash,
    },
  });
  await prisma.wallet.upsert({
    where: { userId_kind: { userId: user.id, kind: "MAIN" } },
    update: { balance: 2500 },
    create: { userId: user.id, kind: "MAIN", balance: 2500 },
  });
  await prisma.wallet.upsert({
    where: { userId_kind: { userId: user.id, kind: "COMMISSION" } },
    update: {},
    create: { userId: user.id, kind: "COMMISSION", balance: 0 },
  });

  console.log("Seed complete.");
  console.log("  Admin OTP phone: 08000000001 (OTP sim: 1234)");
  console.log("  User  OTP phone: 08030000000 (OTP sim: 1234, PIN: 1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
