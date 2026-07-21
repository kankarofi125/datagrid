import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function redactDbUrl(url: string | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Never return password; show only scheme/host/db/query shape for debugging.
    return {
      protocol: u.protocol.replace(":", ""),
      host: u.hostname,
      database: u.pathname.replace(/^\//, "") || null,
      hasPassword: Boolean(u.password),
      hasPooler: u.hostname.includes("-pooler"),
      sslmode: u.searchParams.get("sslmode"),
      channelBinding: u.searchParams.get("channel_binding"),
    };
  } catch {
    return { parseError: true, startsWith: url.slice(0, 12) };
  }
}

function safeError(err: unknown) {
  if (!err || typeof err !== "object") return { message: String(err) };
  const e = err as { name?: string; code?: string; message?: string; meta?: unknown };
  let message = e.message || "unknown error";
  // Strip credentials if Prisma embeds the URL in the message.
  message = message.replace(/postgresql:\/\/[^@\s]+@/gi, "postgresql://***@");
  return {
    name: e.name || "Error",
    code: e.code || null,
    message: message.slice(0, 280),
  };
}

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);
  const dbUrlMeta = redactDbUrl(process.env.DATABASE_URL);

  if (!hasDatabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        service: "datagrid",
        db: "down",
        reason: "DATABASE_URL missing",
        hasDatabaseUrl,
        hasDirectUrl,
        time: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  // Common Vercel misconfig: leftover SQLite URL from local M1 setup
  if (
    process.env.DATABASE_URL?.startsWith("file:") ||
    dbUrlMeta?.protocol === "file"
  ) {
    return NextResponse.json(
      {
        ok: false,
        service: "datagrid",
        db: "down",
        reason:
          "DATABASE_URL is still SQLite (file:./dev.db). Replace it on Vercel with your Neon postgresql:// URL and redeploy.",
        hasDatabaseUrl,
        hasDirectUrl,
        dbUrlMeta,
        time: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "datagrid",
      db: "up",
      hasDatabaseUrl,
      hasDirectUrl,
      dbUrlMeta,
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json(
      {
        ok: false,
        service: "datagrid",
        db: "down",
        reason: "database connection failed",
        hasDatabaseUrl,
        hasDirectUrl,
        dbUrlMeta,
        error: safeError(err),
        time: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
