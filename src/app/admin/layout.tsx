import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession, isLoggedInIdle } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { SessionIdleGuard } from "@/components/auth/SessionIdleGuard";

export async function generateMetadata(): Promise<Metadata> {
  const session = await getSession();
  const isStaffSession = Boolean(
    session.isLoggedIn &&
      session.userId &&
      session.adminUsername &&
      (session.role === "ADMIN" || session.role === "SUPER_ADMIN")
  );

  return {
    title: isStaffSession ? "Operations" : "Page not found",
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId || !session.adminUsername) {
    notFound();
  }

  // Read-only idle check — no cookie writes in RSC.
  if (isLoggedInIdle(session)) {
    redirect("/api/auth/session/expire?next=/auth/admin?session=expired");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      role: true,
      phoneLocal: true,
      username: true,
      name: true,
    },
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    notFound();
  }

  // Role drift: do not save session in layout (cookie mutation). Rely on next API touch.

  return (
    <>
      <SessionIdleGuard loginPath="/auth/admin?session=expired" />
      <AdminShell
        phone={user.phoneLocal}
        username={user.username}
        name={user.name}
      >
        {children}
      </AdminShell>
    </>
  );
}
