import { execFileSync } from "node:child_process"

const ports = [
  { label: "CXSync Vite desktop UI", port: 6044 },
  { label: "CXSync Cloud backend", port: Number(process.env.CXSYNC_CLOUD_PORT || 6077) },
]

console.log("CXSync dev preflight: checking ports before start...")

for (const target of ports) {
  const pids = findListeningPids(target.port)
  if (!pids.length) {
    console.log(`  ok ${target.label}: port ${target.port} is free.`)
    continue
  }

  console.log(`  ! ${target.label}: port ${target.port} is already used by PID ${pids.join(", ")}. Stopping...`)
  for (const pid of pids) {
    killPid(pid)
  }
  waitForPortRelease(target.port)
  console.log(`  ok ${target.label}: port ${target.port} is free now.`)
}

console.log("CXSync dev preflight: ready.\n")

function findListeningPids(port) {
  return process.platform === "win32" ? findWindowsListeningPids(port) : findUnixListeningPids(port)
}

function findWindowsListeningPids(port) {
  let output = ""
  try {
    output = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
  } catch {
    return []
  }

  const pids = new Set()
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || !/\bLISTENING\b/i.test(line)) continue
    const columns = line.split(/\s+/)
    const localAddress = columns[1] ?? ""
    const pid = Number(columns.at(-1))
    if (!Number.isInteger(pid) || pid <= 0) continue
    if (portFromAddress(localAddress) === port) pids.add(pid)
  }
  return [...pids]
}

function findUnixListeningPids(port) {
  try {
    const output = execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    return [...new Set(output.split(/\s+/).map(Number).filter((pid) => Number.isInteger(pid) && pid > 0))]
  } catch {
    return []
  }
}

function killPid(pid) {
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: ["ignore", "pipe", "pipe"] })
    } else {
      execFileSync("kill", ["-TERM", String(pid)], { stdio: ["ignore", "pipe", "pipe"] })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    console.warn(`  ! Could not stop PID ${pid}: ${message}`)
  }
}

function waitForPortRelease(port) {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (!findListeningPids(port).length) return
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250)
  }
  const pids = findListeningPids(port)
  if (pids.length) {
    throw new Error(`Port ${port} is still in use by PID ${pids.join(", ")}.`)
  }
}

function portFromAddress(address) {
  const match = address.match(/:(\d+)$/)
  return match ? Number(match[1]) : null
}
