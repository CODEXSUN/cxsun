import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "zetro",
  appRoute: "/app/zetro",
  audience: "Agent OS app for helper knowledge, provider settings, query tools, business summaries, workflow planning, and future operator actions.",
  capabilities: ["Helper chat", "Provider manager", "Query registry", "Agent roadmap"],
  description: "ZETRO Agent OS app surface connected to the existing Agent OS backend.",
  domains: ["zetro.local"],
  port: 6039,
  title: "ZETRO",
  transactionLinks: ["Agent OS APIs", "Approved query tools", "Audit logs", "Future typed actions"],
})
