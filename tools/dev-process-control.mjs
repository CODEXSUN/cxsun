import { randomBytes } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createConnection, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function startProcessControl(name, onStop) {
  const file = controlFile(name, process.pid);
  const token = randomBytes(32).toString("hex");
  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    socket.setTimeout(2000, () => socket.destroy());
    socket.once("data", (value) => {
      if (String(value).trim() !== token) {
        socket.end("unauthorized\n");
        return;
      }
      socket.end("stopping\n", onStop);
    });
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Invalid dev control address");
  await writeFile(file, JSON.stringify({ pid: process.pid, port: address.port, token }), {
    mode: 0o600
  });

  return async () => {
    if (server.listening) {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
    await rm(file, { force: true });
  };
}

export async function requestProcessStop(name, pid) {
  let address;
  try {
    address = JSON.parse(await readFile(controlFile(name, pid), "utf8"));
  } catch {
    return false;
  }
  if (address?.pid !== pid || !Number.isInteger(address.port) || !address.token) return false;

  return new Promise((resolveStop) => {
    const socket = createConnection({ host: "127.0.0.1", port: address.port });
    let response = "";
    socket.setEncoding("utf8");
    socket.setTimeout(2000, () => socket.destroy());
    socket.once("connect", () => socket.end(`${address.token}\n`));
    socket.on("data", (chunk) => (response += chunk));
    socket.once("close", () => resolveStop(response.trim() === "stopping"));
    socket.once("error", () => resolveStop(false));
  });
}

function controlFile(name, pid) {
  return join(tmpdir(), `cxsun-dev-${name}-${pid}.json`);
}
