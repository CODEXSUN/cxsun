import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { AuditorCredentialPortal } from "./client.types.js";

function encryptionKey(secretKey: string) {
  if (!secretKey) throw new Error("Auditor credential encryption key is required.");
  return createHash("sha256").update("cxsun.auditor.credentials.v1:").update(secretKey).digest();
}

function associatedData(clientId: number, portal: AuditorCredentialPortal) {
  return Buffer.from(`auditor.client:${clientId}:${portal}`, "utf8");
}

export function encryptAuditorPassword(
  password: string,
  secretKey: string,
  clientId: number,
  portal: AuditorCredentialPortal
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secretKey), iv);
  cipher.setAAD(associatedData(clientId, portal));
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64")
  ].join(".");
}

export function decryptAuditorPassword(
  value: string,
  secretKey: string,
  clientId: number,
  portal: AuditorCredentialPortal
) {
  const [version, iv, tag, ciphertext, extra] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext || extra) {
    throw new Error("Auditor credential format is invalid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(secretKey),
    Buffer.from(iv, "base64")
  );
  decipher.setAAD(associatedData(clientId, portal));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}
