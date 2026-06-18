import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "zetro",
  allowedHosts: ["zetro.local"],
  outDir: "../../build/apps/zetro",
  port: 6039,
})
