import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { vtuRouter } from "@/lib/vtu/router";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || "").toUpperCase();

  if (type === "METER") {
    const result = await vtuRouter.validateMeter({
      disco: String(body.disco || body.billerCode || ""),
      meter: String(body.meter || "").replace(/\D/g, ""),
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Invalid meter" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      customerName: result.customerName,
      provider: result.providerCode,
    });
  }

  if (type === "IUC") {
    const result = await vtuRouter.validateIUC({
      biller: String(body.billerCode || ""),
      smartCard: String(body.smartCard || ""),
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Invalid IUC" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      customerName: result.customerName,
      provider: result.providerCode,
    });
  }

  return NextResponse.json({ error: "Unknown validation type" }, { status: 400 });
}
