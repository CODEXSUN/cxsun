import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "upvc",
  appRoute: "/app/upvc",
  audience: "UPVC manufacturing app for measurements, quotations, production, installation tracking, inventory, and billing.",
  capabilities: ["Measurement sheet", "Quotation flow", "Production/installation", "Project billing"],
  description: "Industry app for UPVC manufacturing and installation clients.",
  domains: ["upvc.local"],
  port: 6042,
  title: "UPVC Manufacturing",
  transactionLinks: ["Quotation to invoice", "Project receipts", "Inventory issue", "Customer ledger"],
})
