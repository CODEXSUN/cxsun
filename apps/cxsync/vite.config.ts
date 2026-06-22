import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "cxsync",
  allowedHosts: ["cxsync.local"],
  define: (env) => ({
    __CXSYNC_CLOUD_PUBLIC_URL__: JSON.stringify(env.CXSYNC_CLOUD_PUBLIC_URL?.trim() ?? ""),
  }),
  outDir: "../../build/apps/cxsync",
  port: 6044,
})
