import {
  getIronSession,
  type IronSession,
  type SessionOptions,
} from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/** Idle timeout: log out after this much inactivity (sliding window). */
export const SESSION_IDLE_MS = 10 * 60 * 1000;
export const SESSION_IDLE_SEC = 10 * 60;

function resolveSessionPassword(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error(
        "SESSION_SECRET must be set to a random string of at least 32 characters in production"
      );
    }
    if (secret.includes("change-in-prod") || secret.includes("datagrid-dev")) {
      throw new Error(
        "SESSION_SECRET must not use the development default in production"
      );
    }
    return secret;
  }
  return (
    secret ||
    "datagrid-dev-session-secret-change-in-prod-32b"
  );
}

export type SessionData = {
  userId?: string;
  phone?: string;
  role?: string;
  pendingGoogle?: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    referral?: string;
    expiresAt: number;
  };
  adminUsername?: string;
  pendingLogin2fa?: {
    userId: string;
    phone: string;
    email: string;
    googleSub?: string;
    name?: string | null;
    role: string;
    expiresAt: number;
  };
  pendingSecurity?: {
    purpose: "pin_change" | "email_change";
    userId: string;
    targetEmail?: string;
    destinationHint?: string;
    verified: boolean;
    expiresAt: number;
  };
  /** Multi-step create-account flow before a User row exists. */
  pendingSignup?: {
    name: string;
    email: string;
    phone: string;
    phoneLocal: string;
    referral?: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    googleSub?: string;
    googleAvatar?: string;
    expiresAt: number;
  };
  needsPinSetup?: boolean;
  lastActivityAt?: number;
  isLoggedIn: boolean;
};

/** How long a multi-step signup may sit idle in session. */
export const PENDING_SIGNUP_MS = 20 * 60 * 1000;

export const sessionOptions: SessionOptions = {
  password: resolveSessionPassword(),
  cookieName: "datagrid_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_IDLE_SEC,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function isLoggedInIdle(
  session: Pick<SessionData, "isLoggedIn" | "lastActivityAt">
): boolean {
  if (!session.isLoggedIn) return false;
  const last = session.lastActivityAt;
  if (!last || typeof last !== "number") return false;
  return Date.now() - last > SESSION_IDLE_MS;
}

export async function clearLoggedInSession(
  session: IronSession<SessionData>
) {
  delete session.userId;
  delete session.phone;
  delete session.role;
  delete session.adminUsername;
  delete session.needsPinSetup;
  delete session.lastActivityAt;
  delete session.pendingLogin2fa;
  delete session.pendingSecurity;
  delete session.pendingSignup;
  session.isLoggedIn = false;
  await session.save();
}

/** Live pending signup or null if missing/expired. */
export function getLivePendingSignup(
  session: Pick<SessionData, "pendingSignup">
): NonNullable<SessionData["pendingSignup"]> | null {
  const p = session.pendingSignup;
  if (!p || p.expiresAt <= Date.now()) return null;
  return p;
}

export async function touchSessionActivity(
  session: IronSession<SessionData>
) {
  if (!session.isLoggedIn) return;
  session.lastActivityAt = Date.now();
  await session.save();
}

export type RequireUserOpts = {
  /** Allow session while user still must set a PIN (PIN setup APIs only). */
  allowWithoutPin?: boolean;
};

/**
 * Require active logged-in user. Re-checks isActive from DB.
 * Enforces PIN setup unless allowWithoutPin.
 */
export async function requireUser(opts: RequireUserOpts = {}) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  if (isLoggedInIdle(session)) {
    await clearLoggedInSession(session);
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      isActive: true,
      pinHash: true,
      role: true,
      phone: true,
    },
  });

  if (!user || !user.isActive) {
    await clearLoggedInSession(session);
    return null;
  }

  // Keep session role in sync with DB (no extra save unless changed later).
  if (session.role !== user.role) {
    session.role = user.role;
  }
  if (session.phone !== user.phone) {
    session.phone = user.phone;
  }

  const needsPin = !user.pinHash || Boolean(session.needsPinSetup);
  if (needsPin && !opts.allowWithoutPin) {
    session.needsPinSetup = true;
    await session.save();
    return null;
  }

  if (!needsPin && session.needsPinSetup) {
    delete session.needsPinSetup;
  }

  await touchSessionActivity(session);
  return session;
}

export async function requireAdmin() {
  const session = await requireUser({ allowWithoutPin: true });
  if (!session) return null;
  if (!session.adminUsername) return null;
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") return null;
  return session;
}

export function markSessionLogin(
  session: IronSession<SessionData>,
  data: {
    userId: string;
    phone: string;
    role: string;
    adminUsername?: string;
    needsPinSetup?: boolean;
  }
) {
  session.userId = data.userId;
  session.phone = data.phone;
  session.role = data.role;
  session.isLoggedIn = true;
  session.lastActivityAt = Date.now();
  delete session.pendingSignup;
  delete session.pendingLogin2fa;
  delete session.pendingGoogle;
  if (data.adminUsername) session.adminUsername = data.adminUsername;
  else delete session.adminUsername;
  if (data.needsPinSetup) session.needsPinSetup = true;
  else delete session.needsPinSetup;
}

/** Safe relative redirect path only (blocks //evil.com open redirects). */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback: string
): string {
  if (!raw || typeof raw !== "string") return fallback;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  if (path.includes("://") || path.includes("\\")) return fallback;
  // Disallow control characters
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;
  return path;
}
