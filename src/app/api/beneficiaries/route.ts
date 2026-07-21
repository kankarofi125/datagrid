import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { detectNetwork, toLocalPhone } from "@/lib/phone";
import type { TxService } from "@prisma/client";

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service");

  const rows = await prisma.beneficiary.findMany({
    where: {
      userId: session.userId,
      ...(service ? { service: service.toUpperCase() as TxService } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    beneficiaries: rows.map((b) => ({
      id: b.id,
      label: b.label,
      phone: b.phone,
      networkCode: b.networkCode,
      service: b.service,
    })),
  });
}

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const local = toLocalPhone(String(body.phone || ""));
  if (!local) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }
  const service = String(body.service || "DATA").toUpperCase() as TxService;
  const label = String(body.label || local).slice(0, 40);
  const networkCode = body.networkCode || detectNetwork(local);

  const b = await prisma.beneficiary.create({
    data: {
      userId: session.userId,
      label,
      phone: local,
      networkCode: networkCode ? String(networkCode) : null,
      service,
    },
  });

  return NextResponse.json({
    beneficiary: {
      id: b.id,
      label: b.label,
      phone: b.phone,
      networkCode: b.networkCode,
      service: b.service,
    },
  });
}

export async function DELETE(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.beneficiary.deleteMany({
    where: { id, userId: session.userId },
  });
  return NextResponse.json({ ok: true });
}
