import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Public health — minimal payload only (no host/URL recon).
 */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, service: "datagrid", db: "down" },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "datagrid",
      db: "up",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health]", err);
    return NextResponse.json(
      {
        ok: false,
        service: "datagrid",
        db: "down",
        time: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
