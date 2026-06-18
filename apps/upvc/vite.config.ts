import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "upvc",
  allowedHosts: ["upvc.local"],
  outDir: "../../build/apps/upvc",
  port: 6042,
})
