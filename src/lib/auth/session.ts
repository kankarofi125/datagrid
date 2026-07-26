import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

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
   * After correct PIN/Google, before email 2FA code is verified.
   * Session is not fully logged in until OTP succeeds.
   */
  pendingLogin2fa?: {
    userId: string;
    phone: string;
    email: string;
    name?: string | null;
    role: string;
    expiresAt: number;
  };
  isLoggedIn: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "datagrid-dev-session-secret-change-in-prod-32b",
  cookieName: "datagrid_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 14, // 14 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!session) return null;
  if (!session.adminUsername) return null;
  if (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN") return null;
  return session;
}
