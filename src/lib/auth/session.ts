import {
  getIronSession,
  type IronSession,
  type SessionOptions,
} from "iron-session";
import { cookies } from "next/headers";

/** Idle timeout: log out after this much inactivity (sliding window). */
export const SESSION_IDLE_MS = 10 * 60 * 1000;
export const SESSION_IDLE_SEC = 10 * 60;

export type SessionData = {
  userId?: string;
  phone?: string;
  role?: string;
  /** Short-lived, server-verified Google identity awaiting phone OTP linking. */
  pendingGoogle?: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    referral?: string;
    expiresAt: number;
  };
  /** Present when logged in via /auth/admin (username/password) */
  adminUsername?: string;
  /**
   * After correct PIN/Google, before email 2FA (or phone OTP fallback) finishes.
   */
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
  needsPinSetup?: boolean;
  /**
   * Last user activity timestamp (ms). Used for 10‑minute idle logout.
   * Updated in Route Handlers / Server Actions only (not RSC layouts).
   */
  lastActivityAt?: number;
  isLoggedIn: boolean;
};

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "datagrid-dev-session-secret-change-in-prod-32b",
  cookieName: "datagrid_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    // Cookie lifetime matches idle window; refreshed when session is saved in APIs.
    maxAge: SESSION_IDLE_SEC,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * True when a logged-in session is past the idle window.
 * Missing lastActivityAt: not treated as idle (legacy / first paint after login)
 * — cookie maxAge still enforces absolute expiry.
 */
export function isLoggedInIdle(
  session: Pick<SessionData, "isLoggedIn" | "lastActivityAt">
): boolean {
  if (!session.isLoggedIn) return false;
  const last = session.lastActivityAt;
  if (!last || typeof last !== "number") return false;
  return Date.now() - last > SESSION_IDLE_MS;
}

/** Clear full login fields. Call only from Route Handlers / Server Actions. */
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
  session.isLoggedIn = false;
  await session.save();
}

/**
 * Mark activity and refresh cookie maxAge.
 * Call only from Route Handlers / Server Actions — never from RSC layouts.
 */
export async function touchSessionActivity(
  session: IronSession<SessionData>
) {
  if (!session.isLoggedIn) return;
  session.lastActivityAt = Date.now();
  await session.save();
}

/**
 * Require an active (non-idle) logged-in user.
 * Updates lastActivityAt on success (sliding expiry). Safe in API routes.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  if (isLoggedInIdle(session)) {
    await clearLoggedInSession(session);
    return null;
  }
  await touchSessionActivity(session);
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!session) return null;
  if (!session.adminUsername) return null;
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") return null;
  return session;
}

/** Call when establishing a full login (Route Handlers only). */
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
  if (data.adminUsername) session.adminUsername = data.adminUsername;
  else delete session.adminUsername;
  if (data.needsPinSetup) session.needsPinSetup = true;
  else delete session.needsPinSetup;
}
