import type { PlanType } from "@prisma/client";

/**
 * Canonical DATA catalog — Alrahuz-category lineup (SME / CG / SME2 / GIFTING).
 *
 * Wholesale = cheapest exact-SKU Alrahuz API row (live pull 2026-10-04).
 * Retail margin (tight, regressive): <300 +30 · 300-999 +50 ·
 * 1000-2499 +100 · 2500+ +150. Reseller = retail - 20 (floor: +10 over
 * wholesale). providerCode tracks the Alrahuz plan id for reference — the
 * engine resolves its own live plan codes at purchase time.
 *
 * Skipped on purpose: MTN GIFTING 1GB + SME2 1GB + 9mobile SME 3GB
 * (anomalous ₦250/₦660 rows), Airtel 1GB/1.5GB/5GB CG + 9mobile 500MB SME
 * (no exact SKU stocked — unfulfillable).
 */
export type DataPlanDef = {
  network: string;
  type: PlanType;
  name: string;
  sizeMb: number;
  validityDays: number;
  retailPrice: number;
  resellerPrice: number;
  alrId: string;
};

export const DATA_PLANS: DataPlanDef[] = [
  // MTN SME
  { network: "MTN", type: "SME", name: "500MB SME (7-Day)", sizeMb: 500, validityDays: 7, retailPrice: 535, resellerPrice: 515, alrId: "219" },
  { network: "MTN", type: "SME", name: "1GB SME (7-Day)", sizeMb: 1024, validityDays: 7, retailPrice: 445, resellerPrice: 425, alrId: "583" },
  { network: "MTN", type: "SME", name: "1GB SME", sizeMb: 1024, validityDays: 30, retailPrice: 500, resellerPrice: 480, alrId: "755" },
  { network: "MTN", type: "SME", name: "2GB SME", sizeMb: 2048, validityDays: 30, retailPrice: 850, resellerPrice: 830, alrId: "573" },
  { network: "MTN", type: "SME", name: "3GB SME", sizeMb: 3072, validityDays: 30, retailPrice: 1200, resellerPrice: 1180, alrId: "572" },
  { network: "MTN", type: "SME", name: "5GB SME", sizeMb: 5120, validityDays: 30, retailPrice: 1700, resellerPrice: 1680, alrId: "538" },
  { network: "MTN", type: "SME", name: "10GB SME", sizeMb: 10240, validityDays: 30, retailPrice: 3150, resellerPrice: 3130, alrId: "652" },
  // MTN CG (Corporate Gifting)
  { network: "MTN", type: "CG", name: "500MB CG (7-Day)", sizeMb: 500, validityDays: 7, retailPrice: 360, resellerPrice: 340, alrId: "497" },
  { network: "MTN", type: "CG", name: "1GB CG (7-Day)", sizeMb: 1024, validityDays: 7, retailPrice: 450, resellerPrice: 430, alrId: "584" },
  { network: "MTN", type: "CG", name: "1GB CG", sizeMb: 1024, validityDays: 30, retailPrice: 500, resellerPrice: 480, alrId: "752" },
  { network: "MTN", type: "CG", name: "2GB CG", sizeMb: 2048, validityDays: 30, retailPrice: 850, resellerPrice: 830, alrId: "479" },
  { network: "MTN", type: "CG", name: "3GB CG", sizeMb: 3072, validityDays: 30, retailPrice: 1200, resellerPrice: 1180, alrId: "480" },
  { network: "MTN", type: "CG", name: "5GB CG", sizeMb: 5120, validityDays: 30, retailPrice: 1700, resellerPrice: 1680, alrId: "502" },
  { network: "MTN", type: "CG", name: "10GB CG", sizeMb: 10240, validityDays: 30, retailPrice: 3150, resellerPrice: 3130, alrId: "653" },
  // MTN SME2
  { network: "MTN", type: "SME2", name: "2GB SME2", sizeMb: 2048, validityDays: 30, retailPrice: 850, resellerPrice: 830, alrId: "481" },
  { network: "MTN", type: "SME2", name: "10GB SME2", sizeMb: 10240, validityDays: 30, retailPrice: 3150, resellerPrice: 3130, alrId: "657" },
  // MTN GIFTING
  { network: "MTN", type: "GIFTING", name: "2GB Gifting", sizeMb: 2048, validityDays: 30, retailPrice: 850, resellerPrice: 830, alrId: "580" },
  { network: "MTN", type: "GIFTING", name: "3GB Gifting", sizeMb: 3072, validityDays: 30, retailPrice: 1200, resellerPrice: 1180, alrId: "571" },
  { network: "MTN", type: "GIFTING", name: "5GB Gifting", sizeMb: 5120, validityDays: 30, retailPrice: 1700, resellerPrice: 1680, alrId: "570" },
  { network: "MTN", type: "GIFTING", name: "10GB Gifting", sizeMb: 10240, validityDays: 30, retailPrice: 3150, resellerPrice: 3130, alrId: "654" },
  // AIRTEL CG
  { network: "AIRTEL", type: "CG", name: "2GB CG", sizeMb: 2048, validityDays: 30, retailPrice: 1570, resellerPrice: 1550, alrId: "517" },
  { network: "AIRTEL", type: "CG", name: "10GB CG", sizeMb: 10240, validityDays: 30, retailPrice: 4060, resellerPrice: 4040, alrId: "521" },
  // GLO CG
  { network: "GLO", type: "CG", name: "1GB CG", sizeMb: 1024, validityDays: 30, retailPrice: 450, resellerPrice: 430, alrId: "285" },
  { network: "GLO", type: "CG", name: "2GB CG", sizeMb: 2048, validityDays: 30, retailPrice: 850, resellerPrice: 830, alrId: "286" },
  { network: "GLO", type: "CG", name: "3GB CG", sizeMb: 3072, validityDays: 30, retailPrice: 1300, resellerPrice: 1280, alrId: "287" },
  { network: "GLO", type: "CG", name: "5GB CG", sizeMb: 5120, validityDays: 30, retailPrice: 2100, resellerPrice: 2080, alrId: "288" },
  { network: "GLO", type: "CG", name: "10GB CG", sizeMb: 10240, validityDays: 30, retailPrice: 4150, resellerPrice: 4130, alrId: "289" },
  // 9MOBILE SME
  { network: "NINEMOBILE", type: "SME", name: "1GB SME", sizeMb: 1024, validityDays: 30, retailPrice: 250, resellerPrice: 230, alrId: "248" },
  { network: "NINEMOBILE", type: "SME", name: "2GB SME", sizeMb: 2048, validityDays: 30, retailPrice: 770, resellerPrice: 750, alrId: "250" },
  { network: "NINEMOBILE", type: "SME", name: "5GB SME", sizeMb: 5120, validityDays: 30, retailPrice: 1200, resellerPrice: 1180, alrId: "253" },
  { network: "NINEMOBILE", type: "SME", name: "10GB SME", sizeMb: 10240, validityDays: 30, retailPrice: 2300, resellerPrice: 2280, alrId: "292" },
  // 9MOBILE CG
  { network: "NINEMOBILE", type: "CG", name: "500MB CG", sizeMb: 500, validityDays: 30, retailPrice: 270, resellerPrice: 250, alrId: "302" },
  { network: "NINEMOBILE", type: "CG", name: "1GB CG", sizeMb: 1024, validityDays: 30, retailPrice: 530, resellerPrice: 510, alrId: "296" },
  { network: "NINEMOBILE", type: "CG", name: "2GB CG", sizeMb: 2048, validityDays: 30, retailPrice: 1010, resellerPrice: 990, alrId: "297" },
];
