import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "sites",
  appRoute: "/app/sites",
  audience: "Sites app for tenant websites, pages, landing sections, domain routing, SEO metadata, and brand publishing.",
  capabilities: ["Tenant sites", "Domain mapping", "Pages", "Brand content"],
  description: "Public sites app for multi-client and owned-domain publishing.",
  domains: ["*.codexsun.com", "sites.local"],
  port: 6037,
  title: "Sites",
  transactionLinks: ["Tenant domain engine", "Media/files", "Blog content", "Lead capture"],
})
