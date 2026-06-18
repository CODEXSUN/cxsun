import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "garment",
  allowedHosts: ["garment.local"],
  outDir: "../../build/apps/garment",
  port: 6041,
})
