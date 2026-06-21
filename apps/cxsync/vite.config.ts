import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "cxsync",
  allowedHosts: ["cxsync.local"],
  outDir: "../../build/apps/cxsync",
  port: 6044,
})
