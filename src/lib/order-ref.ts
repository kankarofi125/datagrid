import { customAlphabet } from "nanoid";

const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

/** DG-YYYYMMDD-XXXX */
export function makeOrderRef(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `DG-${y}${m}${d}-${nano()}`;
}

export function makeIdempotencyKey(prefix = "idm") {
  return `${prefix}_${Date.now()}_${nano()}${nano()}`;
}
