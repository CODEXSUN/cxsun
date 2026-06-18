import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "auditor",
  appRoute: "/app/auditor",
  audience: "Auditor office workspace and client portal connected to billing, accounts, GST filing, documents, and client communication.",
  capabilities: ["Client filing workspace", "Service billing", "Document requests", "GST status tracking"],
  description: "Auditor office app for Aaran Associates and future accounting-service clients.",
  domains: ["aaranassociates.com", "www.aaranassociates.com"],
  port: 6030,
  title: "Auditor Portal",
  transactionLinks: ["Billing service invoices", "Accounting ledger posting", "GST compliance records", "Mail/document delivery"],
})
