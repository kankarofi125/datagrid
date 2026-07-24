import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CacheKeys, invalidate } from "@/lib/cache";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: Request) {
  const session = await requireUser();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();

  if (name && (name.length < 2 || name.length > 70)) {
    return NextResponse.json(
      { error: "Name must be between 2 and 70 characters." },
      { status: 400 }
    );
  }
  if (email && (email.length > 120 || !EMAIL_PATTERN.test(email))) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name || null,
        email: email || null,
      },
      select: { name: true, email: true },
    });
    await invalidate(CacheKeys.userProfile(session.userId));
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That email address is already connected to another account." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Could not update your profile right now." },
      { status: 500 }
    );
  }
}
