/**
 * Shared OTP length for server generation and client DigitField UIs.
 * Keep in sync with TOKEN_LENGTH in otp.ts (re-exported from here).
 */
export const OTP_LENGTH = 6;

/** OTP codes expire after 2 minutes (phone + email). */
export const OTP_TTL_MS = 2 * 60 * 1000;
export const OTP_TTL_MINUTES = 2;
export const OTP_TTL_SECONDS = 120;
