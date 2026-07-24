import { adminGate } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { cached, CacheKeys, CacheTags, CacheTTL } from "@/lib/cache";
import { privateJson } from "@/lib/http-cache";

/** Live integration health for ERP dashboard */
export async function GET() {
  const { error } = await adminGate();
  if (error) return error;

  const data = await cached(
    CacheKeys.adminIntegrations(),
    async () => {
      const providers = await prisma.provider.findMany({
        orderBy: { priority: "asc" },
      });

      return {
        integrations: [
          {
            id: "database",
            name: "Neon Postgres",
            category: "Infrastructure",
            status: process.env.DATABASE_URL?.startsWith("postgresql")
              ? "UP"
              : "MISCONFIGURED",
            detail: process.env.DATABASE_URL?.includes("pooler")
              ? "Pooled"
              : "Direct / unknown",
          },
          {
            id: "otp",
            name: "OTP / Termii",
            category: "Messaging",
            status:
              process.env.OTP_MODE === "simulate" || !process.env.TERMII_API_KEY
                ? "SIMULATE"
                : "LIVE",
            detail: process.env.OTP_MODE || "simulate",
          },
          {
            id: "paystack",
            name: "Paystack",
            category: "Payments",
            status: process.env.PAYSTACK_SECRET_KEY ? "CONFIGURED" : "SIMULATE",
            detail: process.env.PAYMENT_MODE || "simulate",
          },
          {
            id: "flutterwave",
            name: "Flutterwave",
            category: "Payments",
            status: process.env.FLUTTERWAVE_SECRET_KEY ? "CONFIGURED" : "OFF",
            detail: "Card / transfer",
          },
          {
            id: "monnify",
            name: "Monnify",
            category: "Payments",
            status: process.env.MONNIFY_API_KEY ? "CONFIGURED" : "OFF",
            detail: "Virtual accounts",
          },
          ...providers.map((provider) => ({
            id: `vtu-${provider.code}`,
            name: provider.name,
            category: "VTU",
            status: provider.isActive ? "ACTIVE" : "DISABLED",
            detail: `${provider.role} · ${Number(provider.successRate).toFixed(1)}% success`,
          })),
        ],
      };
    },
    { ttl: CacheTTL.operational, tags: [CacheTags.admin] }
  );

  return privateJson(data);
}
