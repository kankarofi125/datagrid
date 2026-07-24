import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { privateJson } from "@/lib/http-cache";

export async function adminGate() {
  const session = await requireAdmin();
  if (!session) {
    return {
      session: null as null,
      error: privateJson({ error: "Not found" }, { status: 404 }),
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
      error: privateJson({ error: "Not found" }, { status: 404 }),
    };
  }
  return { session: { ...session, userId: user.id, role: user.role }, error: null };
}
