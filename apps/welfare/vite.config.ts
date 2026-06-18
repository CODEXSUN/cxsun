import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "welfare",
  allowedHosts: ["aaran.org", "www.aaran.org", "welfare.local"],
  outDir: "../../build/apps/welfare",
  port: 6035,
})
