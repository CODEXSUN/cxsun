import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "sites",
  allowedHosts: ["sites.local", ".codexsun.com"],
  outDir: "../../build/apps/sites",
  port: 6037,
})
