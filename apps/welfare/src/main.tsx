import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "welfare",
  appRoute: "/app/welfare",
  audience: "Welfare organization app for members, donations, activities, public pages, receipts, and communication.",
  capabilities: ["Member registry", "Donation receipts", "Activity updates", "Public welfare pages"],
  description: "Welfare app for Aaran and future social organization work.",
  domains: ["aaran.org", "www.aaran.org"],
  port: 6035,
  title: "Welfare Organization",
  transactionLinks: ["Donation receipts", "Accounting posting", "Mail updates", "Public site content"],
})
