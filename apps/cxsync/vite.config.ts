import { productAppViteConfig } from "@cxsun/app-shell/vite"
import { readFileSync } from "node:fs"

const packageVersion = (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }).version

export default productAppViteConfig({
  appName: "cxsync",
  allowedHosts: ["cxsync.local"],
  define: (env) => ({
    __CXSYNC_CLOUD_PUBLIC_URL__: JSON.stringify(env.CXSYNC_CLOUD_PUBLIC_URL?.trim() ?? ""),
    __CXSYNC_VERSION__: JSON.stringify(packageVersion),
  }),
  outDir: "../../build/apps/cxsync",
  port: 6044,
})
