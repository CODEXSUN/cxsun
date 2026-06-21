import { spawn } from "node:child_process"
import { platform } from "node:os"
import { resolve } from "node:path"

const env = {
  ...process.env,
  CXSYNC_DEV_SERVER_URL: process.env.CXSYNC_DEV_SERVER_URL || "http://127.0.0.1:6044",
}

await waitForDevServer(env.CXSYNC_DEV_SERVER_URL)

const child =
  platform() === "win32"
    ? spawn(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/c", resolve(process.cwd(), "../../node_modules/.bin/electron.cmd"), "."],
        {
          env,
          stdio: "inherit",
          windowsHide: false,
        },
      )
    : spawn(resolve(process.cwd(), "../../node_modules/.bin/electron"), ["."], {
        env,
        stdio: "inherit",
      })

child.on("exit", (code) => process.exit(code ?? 0))
child.on("error", (error) => {
  console.error(error)
  process.exit(1)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal)
  })
}

async function waitForDevServer(url) {
  const deadline = Date.now() + 60_000
  let lastError

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" })
      if (response.ok) return
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolveReady) => setTimeout(resolveReady, 500))
  }

  console.error(`CXSync dev server was not reachable at ${url}.`)
  if (lastError) console.error(lastError)
  process.exit(1)
}
