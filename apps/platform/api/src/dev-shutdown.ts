import { readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:net";

type ControlAddress = { pid: number; port: number };

export async function startDevShutdownControl(onStop: () => void): Promise<() => Promise<void>> {
  const file = process.env.CXSUN_DEV_SHUTDOWN_FILE;
  const token = process.env.CXSUN_DEV_SHUTDOWN_TOKEN;
  if (!file || !token) return async () => {};

  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    socket.setTimeout(2000, () => socket.destroy());
    socket.once("data", (value) => {
      if (String(value).trim() !== token) {
        socket.end("unauthorized\n");
        return;
      }
      socket.end("stopping\n", () => onStop());
    });
  });

  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(0, "127.0.0.1", resolveListen);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Invalid dev shutdown address");
    await writeFile(file, JSON.stringify({ pid: process.pid, port: address.port }), {
      mode: 0o600
    });
  } catch (error) {
    server.close();
    throw error;
  }

  return async () => {
    await closeControlServer(server);
    try {
      const address = JSON.parse(await readFile(file, "utf8")) as ControlAddress;
      if (address.pid === process.pid) await rm(file, { force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  };
}

async function closeControlServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}
