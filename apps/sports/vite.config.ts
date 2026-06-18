import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "sports",
  allowedHosts: ["tenkasisports.com", "www.tenkasisports.com", "sports.local"],
  outDir: "../../build/apps/sports",
  port: 6033,
})
