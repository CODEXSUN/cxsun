import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "crm",
  appRoute: "/app/crm",
  audience: "CRM app for leads, customers, campaigns, follow-up, tasks, and sales pipeline activity across tenant businesses.",
  capabilities: ["Lead pipeline", "Customer follow-up", "Campaigns", "Task handoff"],
  description: "CRM surface shared by owned products and tenant businesses.",
  domains: ["crm.local"],
  port: 6036,
  title: "CRM",
  transactionLinks: ["Customer master", "Sales conversion", "Mail campaigns", "Task activity"],
})
