import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Returns raw key once — never stored plaintext */
export async function createApiKey(opts: {
  userId: string;
  name: string;
  scopes?: string[];
}) {
  const raw = `dg_live_${randomBytes(24).toString("base64url")}`;
  const keyHash = hashApiKey(raw);
  const keyPrefix = raw.slice(0, 12);

  const row = await prisma.apiKey.create({
    data: {
      userId: opts.userId,
      name: opts.name.slice(0, 64),
      keyPrefix,
      keyHash,
      scopes: JSON.stringify(
        opts.scopes || ["data:buy", "airtime:buy", "wallet:read", "status:read"]
      ),
    },
  });

  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    rawKey: raw,
    scopes: JSON.parse(row.scopes) as string[],
    createdAt: row.createdAt,
  };
}

export async function resolveApiKey(authHeader: string | null) {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const raw = m[1].trim();
  if (!raw.startsWith("dg_live_")) return null;

  const keyHash = hashApiKey(raw);
  const row = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        include: { wallets: true },
      },
    },
  });
  if (!row || row.revokedAt) return null;

  await prisma.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    apiKeyId: row.id,
    userId: row.userId,
    scopes: JSON.parse(row.scopes) as string[],
    user: row.user,
  };
}

export function hasScope(scopes: string[], need: string) {
  return scopes.includes(need) || scopes.includes("*");
}
