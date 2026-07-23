import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Staff ERP login — username + password.
 * Only ADMIN / SUPER_ADMIN with passwordHash may sign in here.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (username.length > 64 || password.length > 256) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog
      .create({
        data: {
          actorId: user.id,
          action: "ADMIN_LOGIN",
          entityType: "User",
          entityId: user.id,
          after: JSON.stringify({ username: user.username }),
        },
      })
      .catch(() => {});

    const session = await getSession();
    session.userId = user.id;
    session.phone = user.phone;
    session.role = user.role;
    session.adminUsername = user.username || username;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[auth/admin/login]", err);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
