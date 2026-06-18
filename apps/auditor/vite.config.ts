import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "auditor",
  allowedHosts: ["aaranassociates.com", "www.aaranassociates.com", "auditor.local"],
  outDir: "../../build/apps/auditor",
  port: 6030,
})
