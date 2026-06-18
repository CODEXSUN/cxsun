import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "crm",
  allowedHosts: ["crm.local"],
  outDir: "../../build/apps/crm",
  port: 6036,
})
