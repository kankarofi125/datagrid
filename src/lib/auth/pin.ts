import bcrypt from "bcryptjs";

export function isValidPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export async function hashPin(pin: string) {
  if (!isValidPin(pin)) throw new Error("PIN must be 4 digits");
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string | null | undefined) {
  if (!hash || !isValidPin(pin)) return false;
  return bcrypt.compare(pin, hash);
}
