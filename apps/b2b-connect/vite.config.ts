import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "b2b-connect",
  allowedHosts: ["tirupurconnect.com", "www.tirupurconnect.com", "b2b-connect.local"],
  outDir: "../../build/apps/b2b-connect",
  port: 6032,
})
