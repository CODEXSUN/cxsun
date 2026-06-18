import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "ecommerce",
  appRoute: "/app/ecommerce",
  audience: "Store owner workspace for storefront catalog, orders, payment follow-up, inventory handoff, and invoice creation.",
  capabilities: ["Store catalog", "Order management", "Customer checkout handoff", "Invoice generation"],
  description: "Ecommerce administration surface for Tirupur Direct, Horse Club, and future branded stores.",
  domains: ["tirupurdirect.com", "horseclub.in"],
  port: 6031,
  title: "Ecommerce",
  transactionLinks: ["Billing sales invoices", "Inventory stock movement", "Customer ledger", "Mail/PDF invoices"],
})
