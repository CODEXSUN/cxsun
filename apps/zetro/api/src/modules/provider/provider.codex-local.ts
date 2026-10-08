import { randomUUID } from "node:crypto";
import { lstat, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { AppError } from "@cxsun/framework/errors";
import {
  cancelCodexDeviceLogin,
  codexAccountEmailAtHome,
  codexCliStatus,
  runCodexAtHome,
  tenantHome
} from "./provider.codex-cli.js";

function localHome() {
  return resolve(process.env.CODEX_HOME || join(homedir(), ".codex"));
}

async function localAuthFile() {
  const path = join(localHome(), "auth.json");
  try {
    const file = await lstat(path);
    if (!file.isFile() || file.isSymbolicLink() || file.size < 2 || file.size > 1_000_000)
      return null;
    return path;
  } catch {
    return null;
  }
}

export async function localCodexStatus() {
  try {
    const home = localHome();
    const result = await runCodexAtHome(["login", "status"], "", 10_000, home);
    const signedIn = result.exitCode === 0 && /logged in/iu.test(result.output);
    return {
      installed: true,
      signedIn,
      accountEmail: signedIn ? await codexAccountEmailAtHome(home) : null,
      bindAvailable: signedIn && Boolean(await localAuthFile())
    };
  } catch {
    return { installed: false, signedIn: false, accountEmail: null, bindAvailable: false };
  }
}

export async function bindLocalCodex(tenantId: string) {
  const local = await localCodexStatus();
  if (!local.installed || !local.signedIn)
    throw AppError.validation("Codex CLI is not signed in on the Platform API computer.");
  const source = await localAuthFile();
  if (!source)
    throw AppError.validation("Local Codex must use a file-based sign-in to bind this tenant.");

  const auth = await readFile(source);
  if (!validAuth(auth)) throw AppError.validation("Local Codex sign-in cache is invalid.");
  const previewHome = await mkdtemp(join(tmpdir(), "cxsun-zetro-local-"));
  try {
    await writeFile(join(previewHome, "auth.json"), auth, { mode: 0o600 });
    const preview = await runCodexAtHome(["login", "status"], "", 10_000, previewHome);
    if (preview.exitCode !== 0 || !/logged in/iu.test(preview.output))
      throw AppError.validation("Local Codex sign-in cache cannot be used separately.");
    const previewEmail = await codexAccountEmailAtHome(previewHome);
    if (local.accountEmail && previewEmail && local.accountEmail !== previewEmail)
      throw AppError.validation("Local Codex account does not match its sign-in cache.");
  } finally {
    await rm(previewHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }

  const home = await tenantHome(tenantId);
  const destination = join(home, "auth.json");
  const temporary = join(home, `.auth-${randomUUID()}.tmp`);
  const backup = join(home, `.auth-${randomUUID()}.bak`);
  const marker = join(home, "zetro-local-binding.json");
  let backedUp = false;
  let installed = false;
  try {
    await cancelCodexDeviceLogin(tenantId);
    await writeFile(temporary, auth, { mode: 0o600, flag: "wx" });
    try {
      const current = await lstat(destination);
      if (!current.isFile() || current.isSymbolicLink())
        throw AppError.validation("Tenant Codex credential path is invalid.");
      await rename(destination, backup);
      backedUp = true;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    await rename(temporary, destination);
    installed = true;
    const status = await codexCliStatus(tenantId);
    if (!status.signedIn || (local.accountEmail && status.accountEmail !== local.accountEmail))
      throw AppError.validation("The local Codex account could not be bound to this tenant.");
    await writeFile(marker, JSON.stringify({ method: "local" }), { mode: 0o600 });
    if (backedUp) await rm(backup, { force: true });
    return { ...status, connectionMethod: "local" as const };
  } catch (error) {
    if (installed) await rm(destination, { force: true });
    if (backedUp) await rename(backup, destination);
    throw error;
  } finally {
    await rm(temporary, { force: true });
  }
}

function validAuth(value: Buffer) {
  if (value.length < 2 || value.length > 1_000_000) return false;
  try {
    const auth = JSON.parse(value.toString("utf8"));
    return auth && typeof auth === "object" && typeof auth.auth_mode === "string";
  } catch {
    return false;
  }
}

function isMissing(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
