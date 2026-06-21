import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "b2b-connect-admin",
  allowedHosts: ["admin.tirupurconnect.com", "b2b-connect-admin.local"],
  outDir: "../../build/apps/b2b-connect-admin",
  port: 6043,
})
