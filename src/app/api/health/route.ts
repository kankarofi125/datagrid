import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  if (!hasDatabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        service: "datagrid",
        db: "down",
        reason: "DATABASE_URL missing",
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
        time: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
