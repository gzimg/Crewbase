import crypto from "crypto";

/**
 * Encryption for secrets stored in the database (Roblox Open Cloud API keys,
 * RankGun tokens and similar).
 *
 * Format: "enc:v1:<iv>:<auth tag>:<ciphertext>" (hex), using AES-256-GCM with a
 * key derived from ENCRYPTION_KEY. Values without the "enc:v1:" prefix are
 * treated as old plain-text values, so existing data keeps working and gets
 * encrypted the next time it's saved (or by the site admin "Encrypt stored keys" tool).
 */
const PREFIX = "enc:v1:";
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY environment variable is required to store secrets");
  cachedKey = Buffer.from(crypto.hkdfSync("sha256", secret, "crewbase-secrets", "v1", 32));
  return cachedKey;
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  if (isEncryptedSecret(plain)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/** Returns the plain value, or null if it's empty or can't be decrypted. */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!isEncryptedSecret(value)) return value; // legacy plain-text value
  try {
    const [ivHex, tagHex, dataHex] = value.slice(PREFIX.length).split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
  } catch (error) {
    console.error("[secrets] Could not decrypt a stored secret. Was ENCRYPTION_KEY changed?");
    return null;
  }
}

/** Encrypts a value for saving, keeping null/empty as null. */
export function encryptOrNull(value: string | null | undefined): string | null {
  return value ? encryptSecret(value) : null;
}

/** Shows only the last few characters of a secret, for settings screens. */
export function maskSecret(plain: string | null | undefined, visible = 4): string {
  if (!plain) return "";
  return "••••••••" + plain.slice(-visible);
}
