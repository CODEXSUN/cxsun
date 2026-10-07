import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";

export async function requestDevApiShutdown(file, token) {
  let address;
  try {
    address = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return false;
  }
  if (!Number.isInteger(address?.port) || address.port <= 0) return false;

  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port: address.port });
    let response = "";
    socket.setEncoding("utf8");
    socket.setTimeout(2000, () => socket.destroy());
    socket.once("connect", () => socket.end(`${token}\n`));
    socket.on("data", (chunk) => (response += chunk));
    socket.once("close", () => resolve(response.trim() === "stopping"));
    socket.once("error", () => resolve(false));
  });
}
