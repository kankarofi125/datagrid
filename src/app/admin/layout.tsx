import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

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
