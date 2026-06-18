import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type UserConfigExport } from "vite"

type ProductViteOptions = {
  appName: string
  allowedHosts?: string[]
  outDir: string
  port: number
}

const envDir = resolve(process.cwd(), "../..")
const serverStatePath = resolve(envDir, "build/dev/server.json")

export function productAppViteConfig(options: ProductViteOptions): UserConfigExport {
  return defineConfig(({ mode }) => {
    const env = loadEnv(mode, envDir, "")
    const apiTarget = apiProxyTarget(env)
    return {
      envDir,
      plugins: [react()],
      build: {
        emptyOutDir: true,
        outDir: options.outDir,
      },
      server: {
        allowedHosts: allowedHosts(env, options.allowedHosts ?? []),
        host: "0.0.0.0",
        port: Number(env.VITE_PORT) || options.port,
        strictPort: true,
        proxy: proxyConfig(apiTarget),
      },
      preview: {
        allowedHosts: allowedHosts(env, options.allowedHosts ?? []),
        host: "0.0.0.0",
        port: Number(env.VITE_PORT) || options.port,
      },
    }
  })
}

function apiProxyTarget(env: Record<string, string>) {
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL
  if (env.VITE_API_BASE_URL) return env.VITE_API_BASE_URL
  try {
    if (!existsSync(serverStatePath)) return "http://localhost:6005"
    const state = JSON.parse(readFileSync(serverStatePath, "utf8")) as { apiBaseUrl?: string; port?: number }
    return state.apiBaseUrl || `http://localhost:${state.port || 6005}`
  } catch {
    return "http://localhost:6005"
  }
}

function allowedHosts(env: Record<string, string>, appHosts: string[]) {
  return Array.from(new Set([
    "localhost",
    "127.0.0.1",
    ".local",
    ".codexsun.com",
    ...appHosts,
    ...splitCsv(process.env.VITE_ALLOWED_HOSTS),
    ...splitCsv(env.VITE_ALLOWED_HOSTS),
  ]))
}

function proxyConfig(apiTarget: string) {
  return {
    "/api": { changeOrigin: true, target: apiTarget },
    "/health": { changeOrigin: true, target: apiTarget },
    "/storage": { changeOrigin: true, target: apiTarget },
  }
}

function splitCsv(value: string | undefined) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? []
}
