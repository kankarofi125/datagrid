import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/auth/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      phoneLocal: true,
      username: true,
      name: true,
      passwordHash: true,
    },
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/auth/admin");
  }

  // Prefer staff console login; allow legacy phone-admin only if they have username/password set
  // still ok if admin role via OTP for backward compat
  if (session.role !== user.role) {
    session.role = user.role;
    await session.save();
  }

  return (
    <AdminShell
      phone={user.phoneLocal}
      username={user.username}
      name={user.name}
    >
      {children}
    </AdminShell>
  );
}
