import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function adminGate() {
  const session = await requireAdmin();
  if (!session) {
    return {
      session: null as null,
      error: NextResponse.json({ error: "Admin only" }, { status: 403 }),
    };
  }
  // Refresh role from DB in case session is stale
  const user = await prisma.user.findUnique({
    where: { id: session.userId! },
    select: { role: true, id: true },
  });
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return {
      session: null as null,
      error: NextResponse.json({ error: "Admin only" }, { status: 403 }),
    };
  }
  return { session: { ...session, userId: user.id, role: user.role }, error: null };
}
