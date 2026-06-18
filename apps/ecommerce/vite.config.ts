import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "ecommerce",
  allowedHosts: ["tirupurdirect.com", "www.tirupurdirect.com", "horseclub.in", "www.horseclub.in", "ecommerce.local"],
  outDir: "../../build/apps/ecommerce",
  port: 6031,
})
