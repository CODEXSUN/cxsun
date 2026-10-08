import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { AppError } from "@cxsun/framework/errors";

const verificationUrl = "https://auth.openai.com/codex/device";
const ansiColor = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu");
type LoginSession = {
  code: string | null;
  expiresAt: number;
  process: ReturnType<typeof spawn>;
};
const loginSessions = new Map<string, LoginSession>();

export async function codexExecutable() {
  const configured = process.env.CXSUN_ZETRO_CODEX_CLI_PATH;
  if (configured) {
    if (!isAbsolute(configured) || !existsSync(configured)) {
      throw AppError.validation("Configured Codex CLI path does not exist.");
    }
    return configured;
  }
  if (process.platform !== "win32") return "codex";
  const directory = join(
    process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
    "OpenAI",
    "Codex",
    "bin"
  );
  try {
    const paths = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(directory, entry.name, "codex.exe"))
      .filter(existsSync);
    const dated = await Promise.all(
      paths.map(async (path) => ({ path, modified: (await stat(path)).mtimeMs }))
    );
    dated.sort((left, right) => right.modified - left.modified);
    if (dated[0]) return dated[0].path;
  } catch {
    // Fall back to PATH for standalone CLI installations.
  }
  return "codex.exe";
}

export async function tenantHome(tenantId: string) {
  if (!/^(?:[0-9a-f]{8}|[0-9a-f-]{36})$/iu.test(tenantId))
    throw AppError.validation("Tenant ID is invalid.");
  const root = process.env.CXSUN_ZETRO_CODEX_HOME_ROOT || join(homedir(), ".cxsun", "zetro-codex");
  const directory = join(root, tenantId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  return directory;
}

export function hostEnvironment(): NodeJS.ProcessEnv {
  const names = [
    "PATH",
    "Path",
    "PATHEXT",
    "SystemRoot",
    "WINDIR",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "HOME",
    "CODEX_HOME",
    "TMP",
    "TEMP",
    "TMPDIR"
  ];
  return Object.fromEntries(
    names.flatMap((name) => (process.env[name] ? [[name, process.env[name]]] : []))
  );
}

async function runCodex(args: string[], input: string, timeoutMs: number, tenantId: string) {
  const codexHome = await tenantHome(tenantId);
  return runCodexAtHome(args, input, timeoutMs, codexHome);
}

export async function runCodexAtHome(
  args: string[],
  input: string,
  timeoutMs: number,
  codexHome: string
) {
  const executable = await codexExecutable();
  return new Promise<{ exitCode: number | null; output: string }>((resolve, reject) => {
    const child = spawn(executable, args, {
      env: { ...hostEnvironment(), CODEX_HOME: codexHome },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    let output = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding("utf8");
      stream.on("data", (chunk: string) => {
        output += chunk;
        if (output.length > 1_000_000) child.kill();
      });
    }
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, output });
    });
    child.stdin.end(input);
  });
}

export async function codexCliStatus(tenantId: string) {
  try {
    const result = await runCodex(["login", "status"], "", 10_000, tenantId);
    const pending = loginSessions.get(tenantId);
    const signedIn = result.exitCode === 0 && /logged in/iu.test(result.output);
    return {
      installed: true,
      signedIn,
      accountEmail: signedIn ? await codexAccountEmail(tenantId) : null,
      connectionMethod: signedIn ? await connectionMethod(tenantId) : null,
      pending: Boolean(pending && pending.expiresAt > Date.now()),
      code: pending && pending.expiresAt > Date.now() ? pending.code : null,
      verificationUrl,
      expiresAt:
        pending && pending.expiresAt > Date.now() ? new Date(pending.expiresAt).toISOString() : null
    };
  } catch (error) {
    console.warn(
      "[zetro.codex] CLI status check failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      installed: false,
      signedIn: false,
      accountEmail: null,
      connectionMethod: null,
      pending: false,
      code: null,
      verificationUrl,
      expiresAt: null
    };
  }
}

export async function disconnectCodexCli(tenantId: string) {
  await cancelCodexDeviceLogin(tenantId);
  const result = await runCodex(["logout"], "", 10_000, tenantId);
  if (result.exitCode !== 0) throw AppError.internal("Codex CLI could not sign out this tenant.");
  await rm(join(await tenantHome(tenantId), "zetro-local-binding.json"), { force: true });
  const status = await codexCliStatus(tenantId);
  if (status.signedIn) throw AppError.internal("Codex CLI is still signed in for this tenant.");
  return status;
}

export async function cancelCodexDeviceLogin(tenantId: string) {
  const pending = loginSessions.get(tenantId);
  if (!pending) return;
  loginSessions.delete(tenantId);
  const child = pending.process;
  if (child.exitCode !== null) return;
  child.kill();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 2_000);
    child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function codexAccountEmail(tenantId: string): Promise<string | null> {
  const codexHome = await tenantHome(tenantId);
  return codexAccountEmailAtHome(codexHome);
}

export async function codexAccountEmailAtHome(codexHome: string): Promise<string | null> {
  const executable = await codexExecutable();
  return new Promise((resolve) => {
    const child = spawn(executable, ["app-server"], {
      env: { ...hostEnvironment(), CODEX_HOME: codexHome },
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true
    });
    let buffer = "";
    let finished = false;
    let accountEmail: string | null = null;
    const finish = (email: string | null) => {
      if (finished) return;
      finished = true;
      accountEmail = email;
      clearTimeout(timer);
      child.kill();
    };
    const timer = setTimeout(() => finish(null), 10_000);
    child.on("error", () => finish(null));
    child.on("close", () => {
      clearTimeout(timer);
      resolve(accountEmail);
    });
    child.stdin.on("error", () => finish(null));
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      if (buffer.length > 100_000) return finish(null);
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        let message: { id?: number; result?: { account?: { email?: unknown } } };
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (message.id === 1) {
          if (!message.result) return finish(null);
          child.stdin.write(
            JSON.stringify({ id: 2, method: "account/read", params: { refreshToken: false } }) +
              "\n"
          );
        } else if (message.id === 2) {
          const email = message.result?.account?.email;
          finish(typeof email === "string" && email.length <= 320 ? email : null);
        }
      }
    });
    child.stdin.write(
      JSON.stringify({
        id: 1,
        method: "initialize",
        params: { clientInfo: { name: "zetro", title: "Zetro", version: "1.0.0" } }
      }) + "\n"
    );
  });
}

export async function startCodexDeviceLogin(tenantId: string) {
  const status = await codexCliStatus(tenantId);
  if (!status.installed)
    throw AppError.validation("Codex CLI is not installed on the Platform API host.");
  if (status.signedIn || status.pending) return status;
  const codexHome = await tenantHome(tenantId);
  await rm(join(codexHome, "zetro-local-binding.json"), { force: true });
  const executable = await codexExecutable();
  const child = spawn(executable, ["login", "--device-auth"], {
    env: { ...hostEnvironment(), CODEX_HOME: codexHome },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  const session: LoginSession = { code: null, expiresAt: Date.now() + 15 * 60_000, process: child };
  loginSessions.set(tenantId, session);
  const finish = () => {
    if (loginSessions.get(tenantId) === session) loginSessions.delete(tenantId);
  };
  child.on("close", finish);
  child.on("error", finish);
  const timer = setTimeout(() => child.kill(), 15 * 60_000);
  child.on("close", () => clearTimeout(timer));
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk: string) => {
      output = (output + chunk).slice(-8_000);
      const match = output
        .replace(ansiColor, "")
        .match(/one-time code[\s\S]{0,180}?\b([A-Z0-9]{4,6}-[A-Z0-9]{4,6})\b/iu);
      if (match) session.code = match[1]!.toUpperCase();
    });
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    if (session.code) return codexCliStatus(tenantId);
    if (child.exitCode !== null) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!session.code) {
    child.kill();
    throw AppError.internal("Codex CLI did not provide a device code.");
  }
  return codexCliStatus(tenantId);
}

async function connectionMethod(tenantId: string): Promise<"device-code" | "local"> {
  try {
    const marker = await readFile(
      join(await tenantHome(tenantId), "zetro-local-binding.json"),
      "utf8"
    );
    return JSON.parse(marker)?.method === "local" ? "local" : "device-code";
  } catch {
    return "device-code";
  }
}

export async function completeWithCodexCli(
  tenantId: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  if (model && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(model)) {
    throw AppError.validation("Codex model ID is invalid.");
  }
  const directory = await mkdtemp(join(tmpdir(), "cxsun-zetro-codex-"));
  const answerFile = join(directory, "answer.txt");
  const prompt =
    messages.map(({ role, content }) => `${role.toUpperCase()}:\n${content}`).join("\n\n") +
    "\n\nRespond only with the answer. Do not use tools, shell commands, files, or network browsing.";
  try {
    const args = [
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--skip-git-repo-check",
      "--disable",
      "shell_tool",
      "--disable",
      "code_mode",
      "--disable",
      "code_mode_host",
      "--disable",
      "browser_use",
      "--disable",
      "apps",
      "--disable",
      "plugins",
      "--disable",
      "computer_use",
      "--disable",
      "multi_agent",
      "--sandbox",
      "read-only",
      "-c",
      "approval_policy=never",
      "-C",
      directory,
      "--output-last-message",
      answerFile,
      ...(model ? ["--model", model] : []),
      "-"
    ];
    const result = await runCodex(args, prompt, 120_000, tenantId);
    if (result.exitCode !== 0) throw AppError.internal("Local Codex did not complete the request.");
    const answer = (await readFile(answerFile, "utf8")).trim();
    if (!answer) throw AppError.internal("Local Codex returned an empty answer.");
    return answer;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.internal("Local Codex is unavailable on the Platform API host.");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
