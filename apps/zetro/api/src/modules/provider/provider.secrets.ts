import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey(secret: string) {
  if (!secret) throw new Error("Zetro credential encryption secret is required.");
  return createHash("sha256").update("cxsun.zetro.provider.v1:").update(secret).digest();
}

export function encryptZetroApiKey(value: string, secret: string, tenantId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  cipher.setAAD(Buffer.from(`zetro.provider:${tenantId}`));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64")
  ].join(".");
}

export function decryptZetroApiKey(value: string, secret: string, tenantId: string) {
  const [version, iv, tag, encrypted, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted || extra) {
    throw new Error("Zetro credential format is invalid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secret),
    Buffer.from(iv, "base64")
  );
  decipher.setAAD(Buffer.from(`zetro.provider:${tenantId}`));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final()
  ]).toString("utf8");
}
