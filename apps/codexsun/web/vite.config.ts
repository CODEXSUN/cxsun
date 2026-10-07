import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(configDir, "../../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "CXSUN_");
  const apiPort = Number(env.CXSUN_SHELL_API_PORT ?? 7010);
  const webPort = Number(env.CXSUN_SHELL_PORT ?? 7040);

  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("CXSUN_SHELL_API_PORT must be a valid TCP port.");
  }
  if (!Number.isInteger(webPort) || webPort < 1 || webPort > 65535) {
    throw new Error("CXSUN_SHELL_PORT must be a valid TCP port.");
  }

  return {
    build: {
      emptyOutDir: true,
      outDir: "../../../dist/apps/codexsun/web"
    },
    cacheDir: "../../../node_modules/.vite/codexsun-web",
    define: {
      __CXSUN_PLATFORM_WEB_ORIGIN__: JSON.stringify(
        env.CXSUN_SHELL_PLATFORM_WEB_ORIGIN ?? "http://127.0.0.1:7020"
      )
    },
    plugins: [tailwindcss(), react()],
    server: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
      proxy: {
        "/api/platform": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api\/platform/u, "") || "/"
        }
      }
    }
  };
});
