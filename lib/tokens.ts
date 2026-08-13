import crypto from "node:crypto";

/** Onay bağlantıları için tahmin edilemeyen, rastgele bir token üretir. */
export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
