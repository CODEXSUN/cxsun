import { productAppViteConfig } from "@cxsun/app-shell/vite"

export default productAppViteConfig({
  appName: "blog",
  allowedHosts: ["blog.local"],
  outDir: "../../build/apps/blog",
  port: 6038,
})
