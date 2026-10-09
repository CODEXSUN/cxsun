import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  platformWebAllowedHosts,
  requireEnvNumber,
  requireEnvValue,
  resolvePlatformRuntime
} from "@cxsun/framework/env";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const rootPackage = JSON.parse(
  readFileSync(resolve(configDir, "../../../package.json"), "utf8")
) as { version: string };

export default defineConfig(({ command, mode }) => {
  const runtimeEnv = loadEnv(mode, resolve(configDir, "../../.."), "");

  return {
    build: {
      chunkSizeWarningLimit: 450,
      emptyOutDir: true,
      outDir: "../../../dist/apps/platform/web"
    },
    cacheDir: "../../../node_modules/.vite/platform-web",
    envDir: "../../..",
    define: {
      __APP_VERSION__: JSON.stringify(rootPackage.version)
    },
    optimizeDeps: {
      exclude: [
        "@codexsun/blog/web",
        "@cxsun/billing-web",
        "@cxsun/core-web",
        "@cxsun/crm-web",
        "@cxsun/frappe-web",
        "@cxsun/zetro-web"
      ],
      include: [
        "react-is",
        "use-sync-external-store/shim",
        "use-sync-external-store/shim/index.js",
        "use-sync-external-store/shim/with-selector",
        "use-sync-external-store/shim/with-selector.js"
      ]
    },
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@cxsun/core-web/modules/master/contact/workspace": resolve(
          configDir,
          "../../core/web/src/modules/master/contact/contact.workspace.tsx"
        ),
        "@cxsun/crm-web/modules/enquiry/hooks": resolve(
          configDir,
          "../../crm/web/src/modules/enquiry/enquiry.hooks.ts"
        ),
        "@cxsun/ui/layouts/application-layout": resolve(
          configDir,
          "../../../packages/ui/src/layouts/application-layout.tsx"
        ),
        "@cxsun/ui/workspace/lookup": resolve(
          configDir,
          "../../../packages/ui/src/workspace/lookup.tsx"
        ),
        "@cxsun/billing-web/modules/reports": resolve(
          configDir,
          "../../billing/web/src/modules/reports/index.ts"
        ),
        "@cxsun/billing-web/modules/quotation": resolve(
          configDir,
          "../../billing/web/src/modules/quotation/index.ts"
        ),
        "@cxsun/billing-web/modules/sales": resolve(
          configDir,
          "../../billing/web/src/modules/sales/index.ts"
        ),
        "@cxsun/billing-web/modules/purchase": resolve(
          configDir,
          "../../billing/web/src/modules/purchase/index.ts"
        ),
        "@cxsun/billing-web/modules/export-sales": resolve(
          configDir,
          "../../billing/web/src/modules/export-sales/index.ts"
        ),
        "@cxsun/billing-web/modules/receipt": resolve(
          configDir,
          "../../billing/web/src/modules/receipt/index.ts"
        ),
        "@cxsun/billing-web/modules/payment": resolve(
          configDir,
          "../../billing/web/src/modules/payment/index.ts"
        ),
        "@cxsun/crm-web/modules/enquiry": resolve(
          configDir,
          "../../crm/web/src/modules/enquiry/index.ts"
        ),
        "@cxsun/zetro-web/modules/provider": resolve(
          configDir,
          "../../zetro/web/src/modules/provider/index.ts"
        ),
        "@cxsun/zetro-web/modules/admin": resolve(
          configDir,
          "../../zetro/web/src/modules/admin/index.ts"
        ),
        "@cxsun/zetro-web/modules/chat": resolve(
          configDir,
          "../../zetro/web/src/modules/chat/index.ts"
        ),
        "@cxsun/core-web/modules/master/contact": resolve(
          configDir,
          "../../core/web/src/modules/master/contact/index.ts"
        )
      },
      preserveSymlinks: true
    },
    ...(command === "serve" ? { server: platformDevelopmentServer(runtimeEnv) } : {})
  };
});

function platformDevelopmentServer(runtimeEnv: Record<string, string | undefined>) {
  const platformRuntime = resolvePlatformRuntime({
    NODE_ENV: requireEnvValue(runtimeEnv.NODE_ENV, "NODE_ENV"),
    PLATFORM_API_PORT: requireEnvNumber(runtimeEnv.PLATFORM_API_PORT, "PLATFORM_API_PORT")
  });
  const proxy = {
    changeOrigin: false,
    target: platformRuntime.apiUrl
  };

  return {
    allowedHosts: platformWebAllowedHosts(
      requireEnvValue(runtimeEnv.PLATFORM_WEB_ORIGIN, "PLATFORM_WEB_ORIGIN")
    ),
    headers: {
      "Permissions-Policy": "unload=*"
    },
    host: platformRuntime.webBindHost,
    port: requireEnvNumber(runtimeEnv.PLATFORM_WEB_PORT, "PLATFORM_WEB_PORT"),
    proxy: {
      "/api/app": proxy,
      "/api/billing": {
        ...proxy,
        rewrite: (path: string) => path.replace(/^\/api\/billing/u, "") || "/"
      },
      "/api/core": {
        ...proxy,
        rewrite: (path: string) => path.replace(/^\/api\/core/u, "") || "/"
      },
      "/api/project-manager": {
        ...proxy,
        rewrite: (path: string) =>
          `/project-manager${path.replace(/^\/api\/project-manager/u, "") || "/"}`
      },
      "/api/zuno": {
        ...proxy,
        rewrite: (path: string) => `/zuno${path.replace(/^\/api\/zuno/u, "") || "/"}`
      },
      "/api/platform": {
        ...proxy,
        rewrite: (path: string) => path.replace(/^\/api\/platform/u, "") || "/"
      }
    }
  };
}
