import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "learning",
  allowedHosts: ["neot.in", "www.neot.in", "learning.local"],
  outDir: "../../build/apps/learning",
  port: 6034,
})
