import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "textile-lab",
  allowedHosts: ["textile-lab.local", "altexlabs.codexsun.com"],
  outDir: "../../build/apps/textile-lab",
  port: 6040,
})
