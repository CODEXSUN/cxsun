#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { pathToFileURL } from "node:url";
import {
  codexsunTakeoverTarget,
  previousPreflightPids,
  takeoverTarget
} from "./dev-port-ownership.mjs";

const root = resolve(import.meta.dirname, "..");
const app = process.argv[2];

const apps = {
  "platform-api": {
    displayName: "api",
    cwd: "apps/platform/api",
    envKey: "PLATFORM_API_PORT",
    host: "127.0.0.1",
    command: process.execPath,
    args: [
      "--watch",
      "--watch-path=src",
      "--watch-path=../../../.env",
      "--import",
      pathToFileURL(resolve(root, "tools/register-root-package-resolution.mjs")).href,
      "--import",
      "tsx",
      "src/server.ts"
    ]
  },
  "platform-web": {
    displayName: "web",
    cwd: "apps/platform/web",
    envKey: "PLATFORM_WEB_PORT",
    host: "127.0.0.1",
    command: process.execPath,
    args: [nodePackageBin("vite", "bin/vite.js"), "--strictPort"]
  },
  "codexsun-web": {
    displayName: "codexsun",
    cwd: "apps/codexsun/web",
    envKey: "CXSUN_SHELL_PORT",
    defaultPort: "7040",
    host: "127.0.0.1",
    command: process.execPath,
    args: [nodePackageBin("vite", "bin/vite.js"), "--strictPort"]
  }
};

if (!app || !apps[app]) {
  console.log(`Usage: node tools/preflight.mjs <${Object.keys(apps).join("|")}>`);
  process.exit(1);
}

const config = apps[app];
const env = loadDotEnv();
const port = parseRequiredPort(env[config.envKey] ?? config.defaultPort, config.envKey);
const host = config.host;
const portPolicy = process.env.CXSUN_DEV_PORT_POLICY ?? env.CXSUN_DEV_PORT_POLICY ?? "takeover";

await freePort(port, host);

if (app === "platform-api") {
  ensurePlatformApiDependencies();
} else if (app === "platform-web") {
  await waitForPlatformApi(parseRequiredPort(env.PLATFORM_API_PORT, "PLATFORM_API_PORT"));
}

const child = spawn(
  config.command,
  [...config.args, ...(app !== "platform-api" ? ["--host", host, "--port", String(port)] : [])],
  {
    cwd: resolve(root, config.cwd),
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      // The API loads the root .env itself. Keeping those values out of the long-lived
      // watcher lets a child restart read fresh integration credentials after .env changes.
      ...(app !== "platform-api" ? env : {}),
      ...(app === "platform-api"
        ? {
            CXSUN_DB_FRESH_SESSION_FILE: join(tmpdir(), `cxsun-platform-fresh-${process.pid}.done`)
          }
        : {}),
      [config.envKey]: String(port)
    },
    stdio: "inherit"
  }
);

process.send?.({ type: "cxsun:preflight-ready" });
let shuttingDown = false;
child.on("exit", (code) => {
  if (!shuttingDown) process.exit(code ?? 0);
});

process.on("message", (message) => {
  if (message?.type === "cxsun:shutdown") {
    void shutdown("SIGTERM");
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    process.exit(await stopChild(child, signal));
  } catch (error) {
    console.error(`  x Failed to stop ${config.displayName}: ${error.message}`);
    process.exit(1);
  }
}

function loadDotEnv() {
  const envPath = resolve(root, ".env");

  if (!existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])])
  );
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed.replace(/\s+#.*$/, "").trim();
}

function parseRequiredPort(value, envKey) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    console.error(`  x Missing required port configuration: ${envKey}`);
    process.exit(1);
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    console.error(`  x Invalid port configuration for ${envKey}: ${raw}`);
    process.exit(1);
  }

  return port;
}

function ensurePlatformApiDependencies() {
  console.log("  - Checking API package builds");
  buildWorkspacePackage("@cxsun/framework", "startup contract");
}

function buildWorkspacePackage(workspaceName, reason) {
  const startedAt = Date.now();
  console.log(`  build ${workspaceName} (${reason})`);
  runNpm(["run", "build", "-w", workspaceName]);
  console.log(`  ok ${workspaceName} built in ${Date.now() - startedAt}ms`);
}

function runNpm(args) {
  if (process.env.npm_execpath) {
    execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
      cwd: root,
      stdio: "inherit"
    });
    return;
  }

  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", ["npm", ...args].join(" ")], {
      cwd: root,
      stdio: "inherit"
    });
    return;
  }

  execFileSync("npm", args, {
    cwd: root,
    stdio: "inherit"
  });
}

async function freePort(port, host) {
  console.log(`\n  > ${config.displayName} preflight`);
  console.log(`  - Checking ${host}:${port}`);

  const available = await probePort(port, host);
  const pids = available ? [] : getPidsOnPort(port);
  const processes = getProcessSnapshot();
  const previous = previousPreflightPids(processes, app, process.pid);

  if (available && previous.length === 0) {
    await waitForPortRelease();
    console.log(`  ok ${host}:${port} is ready\n`);
    return;
  }

  if (!pids.length && previous.length === 0) {
    console.log(`  ok Port ${port} is ready (no blocking process found)\n`);
    return;
  }

  if (pids.length) console.log(`  ! ${host}:${port} is already in use by PID ${pids.join(", ")}`);
  if (previous.length) {
    console.log(`  - Found previous ${config.displayName} preflight PID ${previous.join(", ")}`);
  }

  if (portPolicy === "abort") {
    console.error(
      "  x A previous dev process or another listener is active. Set CXSUN_DEV_PORT_POLICY=takeover to replace it.\n"
    );
    process.exit(1);
  }

  if (portPolicy !== "takeover" && portPolicy !== "force") {
    console.error(`  x Invalid CXSUN_DEV_PORT_POLICY: ${portPolicy}. Use takeover or abort.\n`);
    process.exit(1);
  }

  const targets = new Set();
  for (const pid of [...pids, ...previous]) {
    const target =
      app === "codexsun-web"
        ? codexsunTakeoverTarget(pid, processes)
        : takeoverTarget(pid, processes, app, process.pid);
    if (!target) {
      console.error(`  x Port ${port} belongs to a process outside Codexsun; refusing takeover.\n`);
      process.exit(1);
    }
    targets.add(target);
  }
  if (targets.has(process.pid)) {
    console.error("  x Refusing to stop the current preflight process.\n");
    process.exit(1);
  }
  for (const pid of targets) {
    try {
      killPid(pid);
      console.log(`  ok Stopped previous dev process tree at PID ${pid}`);
    } catch (error) {
      if (isProcessAlive(pid)) throw error;
      console.log(`  ok Previous dev process PID ${pid} already stopped`);
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await probePort(port, host)) {
      await waitForPortRelease();
      console.log(`  ok ${host}:${port} is ready\n`);
      return;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }

  console.error(`  x Port ${port} was not released after stopping the previous process.\n`);
  process.exit(1);
}

function probePort(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close((error) => resolve(!error));
    });
    server.listen(port, host);
  });
}

function waitForPortRelease() {
  return new Promise((resolveWait) => setTimeout(resolveWait, 100));
}

async function waitForPlatformApi(apiPort) {
  const healthUrl = `http://127.0.0.1:${apiPort}/health`;
  const startedAt = Date.now();
  let lastStatus = "not reachable";

  console.log(`\n  - Waiting for Platform API at ${healthUrl}`);
  while (Date.now() - startedAt < 90_000) {
    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) {
        console.log("  ok Platform API is ready");
        return;
      }
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  console.error(`  x Platform API did not become healthy: ${lastStatus}`);
  console.error("  x Start it separately with: npm run dev:api\n");
  process.exit(1);
}

function getPidsOnPort(port) {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("netstat", ["-ano", "-p", "tcp"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
      });

      return Array.from(
        new Set(
          out
            .split(/\r?\n/)
            .map((line) => line.trim().split(/\s+/))
            .filter(
              (parts) =>
                parts.length >= 5 && parts[3] === "LISTENING" && portFromAddress(parts[1]) === port
            )
            .map((parts) => Number(parts[4]))
            .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
        )
      );
    }

    const out = execFileSync("lsof", ["-ti", `:${port}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });

    return Array.from(
      new Set(
        out
          .split(/\s+/)
          .map(Number)
          .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
      )
    );
  } catch {
    return [];
  }
}

function getProcessSnapshot() {
  try {
    if (process.platform === "win32") {
      const script =
        "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress";
      const output = execFileSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"]
        }
      );
      const records = JSON.parse(output);
      return new Map(
        [records].flat().map((record) => [
          Number(record.ProcessId),
          {
            commandLine: String(record.CommandLine ?? ""),
            name: String(record.Name ?? ""),
            parentPid: Number(record.ParentProcessId),
            pid: Number(record.ProcessId)
          }
        ])
      );
    }

    const output = execFileSync("ps", ["-ww", "-eo", "pid=,ppid=,comm=,args="], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return new Map(
      output
        .split(/\r?\n/u)
        .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/u))
        .filter(Boolean)
        .map((match) => [
          Number(match[1]),
          {
            commandLine: match[4],
            name: match[3],
            parentPid: Number(match[2]),
            pid: Number(match[1])
          }
        ])
    );
  } catch {
    return new Map();
  }
}

function portFromAddress(address) {
  const match = String(address).match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function killPid(pid) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function stopChild(childProcess, signal) {
  const portOwners = getPidsOnPort(port);
  const childPid = childProcess.pid;

  if (process.platform === "win32") {
    for (const pid of [childPid, ...portOwners]) {
      if (!pid || !isProcessAlive(pid)) continue;
      try {
        killPid(pid);
      } catch (error) {
        if (isProcessAlive(pid)) throw error;
      }
    }
  } else if (childPid) {
    try {
      process.kill(-childPid, signal);
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 1500));
    try {
      process.kill(-childPid, "SIGKILL");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
    for (const pid of portOwners) {
      if (isProcessAlive(pid)) process.kill(pid, "SIGKILL");
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await probePort(port, host)) return 0;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  console.error(`  x ${config.displayName} did not release ${host}:${port} during shutdown.`);
  return 1;
}

function nodePackageBin(packageName, binPath) {
  return resolve(root, "node_modules", packageName, binPath);
}
