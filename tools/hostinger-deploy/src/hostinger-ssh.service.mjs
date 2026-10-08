import { execFile, spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class HostingerSshService {
  constructor(target) {
    this.target = target;
  }

  async status() {
    const alias = await this.checkLocalConfig();
    const { stdout } = await execFileAsync(
      "ssh",
      [
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=12",
        "-o",
        "StrictHostKeyChecking=yes",
        alias,
        probeCommand(this.target.demoRoot)
      ],
      { timeout: 25_000, windowsHide: true }
    );
    const remote = parseLines(stdout);
    if (remote.host !== this.target.hostname || remote.user !== this.target.user) {
      throw new Error("The SSH connection reached a different Hostinger VPS identity.");
    }
    if (
      !remote.docker?.startsWith("Docker version ") ||
      !remote.compose?.startsWith("Docker Compose version ")
    ) {
      throw new Error("The Hostinger VPS is missing Docker or Docker Compose.");
    }
    return {
      alias,
      host: this.target.host,
      hostname: remote.host,
      user: remote.user,
      virtualMachineId: this.target.virtualMachineId,
      docker: remote.docker,
      compose: remote.compose,
      demoRoot: this.target.demoRoot,
      demoRootPresent: remote.demoRoot === "present"
    };
  }

  async runOnVerifiedHost(script, timeoutMs = 120_000) {
    if (typeof script !== "string" || !script.trim() || script.includes("\0")) {
      throw new Error("A non-empty remote script is required.");
    }
    const { alias } = await this.status();
    return executeRemoteScript(alias, script, timeoutMs);
  }

  async prepareCheckout() {
    const root = validatedDemoRoot(this.target.demoRoot);
    const script = [
      "set -euo pipefail",
      `root='${root}'`,
      'if [ ! -e "$root" ]; then git clone --branch main https://github.com/CODEXSUN/cxsun.git "$root"; fi',
      'test -d "$root/.git"',
      'test "$(git -C "$root" remote get-url origin)" = "https://github.com/CODEXSUN/cxsun.git"',
      'test "$(git -C "$root" branch --show-current)" = "main"',
      'test -z "$(git -C "$root" status --porcelain)"',
      'printf "commit=%s\\n" "$(git -C "$root" rev-parse HEAD)"'
    ].join("\n");
    const { stdout } = await this.runOnVerifiedHost(script, 180_000);
    return { root, commit: parseLines(stdout).commit };
  }

  async syncCheckout(ref) {
    if (!/^[0-9a-f]{40}$/u.test(ref)) {
      throw new Error("A full Git commit SHA is required for Hostinger sync.");
    }
    const root = validatedDemoRoot(this.target.demoRoot);
    const script = [
      "set -euo pipefail",
      `root='${root}'`,
      `ref='${ref}'`,
      'test -d "$root/.git"',
      'test "$(git -C "$root" remote get-url origin)" = "https://github.com/CODEXSUN/cxsun.git"',
      'test "$(git -C "$root" branch --show-current)" = "main"',
      'test -z "$(git -C "$root" status --porcelain)"',
      'git -C "$root" fetch origin main',
      'git -C "$root" merge-base --is-ancestor "$ref" origin/main',
      'git -C "$root" merge-base --is-ancestor HEAD "$ref"',
      'git -C "$root" merge --ff-only "$ref"',
      'printf "commit=%s\\n" "$(git -C "$root" rev-parse HEAD)"'
    ].join("\n");
    const { stdout } = await this.runOnVerifiedHost(script, 180_000);
    return { root, commit: parseLines(stdout).commit };
  }

  async checkLocalConfig() {
    const alias = process.env.CXSUN_DEPLOY_SSH_ALIAS?.trim() || this.target.alias;
    if (!/^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/u.test(alias)) {
      throw new Error("CXSUN_DEPLOY_SSH_ALIAS must name one SSH host alias.");
    }
    const { stdout } = await execFileAsync("ssh", ["-G", alias], {
      timeout: 10_000,
      windowsHide: true
    });
    const config = parseLines(stdout, " ");
    if (
      config.hostname !== this.target.host ||
      config.user !== this.target.user ||
      Number(config.port) !== this.target.port ||
      !["yes", "true"].includes(config.stricthostkeychecking)
    ) {
      throw new Error("SSH alias does not match the pinned Hostinger VPS target.");
    }
    if (!config.identityfile || !config.userknownhostsfile) {
      throw new Error("SSH alias needs an identity file and a known-hosts file.");
    }
    await Promise.all([access(config.identityfile), access(config.userknownhostsfile)]);
    return alias;
  }
}

function executeRemoteScript(alias, script, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ssh",
      [
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=12",
        "-o",
        "StrictHostKeyChecking=yes",
        alias,
        "bash -se"
      ],
      { timeout: timeoutMs, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(new Error(`The Hostinger command failed with exit code ${code}. ${stderr.trim()}`));
    });
    child.stdin.end(script.endsWith("\n") ? script : `${script}\n`);
  });
}

function probeCommand(demoRoot) {
  const root = validatedDemoRoot(demoRoot);
  return [
    "printf 'host=%s\\n' \"$(hostname)\"",
    "printf 'user=%s\\n' \"$(id -un)\"",
    "printf 'docker=%s\\n' \"$(docker --version)\"",
    "printf 'compose=%s\\n' \"$(docker compose version)\"",
    `test -d '${root}' && printf 'demoRoot=present\\n' || printf 'demoRoot=missing\\n'`
  ].join("; ");
}

function validatedDemoRoot(value) {
  if (!/^\/home\/[a-z0-9-]+$/u.test(value)) {
    throw new Error("The demo checkout must be a simple path under /home.");
  }
  return value;
}

function parseLines(value, separator = "=") {
  return Object.fromEntries(
    value
      .trim()
      .split(/\r?\n/u)
      .flatMap((line) => {
        const index = line.indexOf(separator);
        if (index < 0) return [];
        return [[line.slice(0, index), line.slice(index + separator.length).trim()]];
      })
  );
}
