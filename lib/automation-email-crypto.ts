import "server-only"

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ALGO = "aes-256-gcm"

function getKey(): Buffer {
  const s = process.env.AUTOMATION_EMAIL_SECRET
  if (!s || s.length < 16) {
    throw new Error("AUTOMATION_EMAIL_SECRET must be set (at least 16 characters) to store email passwords")
  }
  return createHash("sha256").update(s).digest()
}

export function encryptAutomationSecret(plain: string): string {
  const iv = randomBytes(16)
  const key = getKey()
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64")
}

export function decryptAutomationSecret(blob: string): string {
  const buf = Buffer.from(blob, "base64")
  if (buf.length < 33) throw new Error("Invalid encrypted payload")
  const iv = buf.subarray(0, 16)
  const tag = buf.subarray(16, 32)
  const data = buf.subarray(32)
  const key = getKey()
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
}
