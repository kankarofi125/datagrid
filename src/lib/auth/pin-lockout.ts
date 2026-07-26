import "server-only";

/**
 * Back-compat re-exports — PIN lockout now lives in login-lockout.ts
 * alongside admin password lockout.
 */
export {
  getPinLockStatus,
  recordPinFailure,
  clearPinFailures,
} from "@/lib/auth/login-lockout";
