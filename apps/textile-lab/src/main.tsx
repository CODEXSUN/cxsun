import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "textile-lab",
  appRoute: "/app/textile-lab",
  audience: "Textile lab app for test requests, samples, lab reports, certificates, billing, and customer communication.",
  capabilities: ["Sample intake", "Testing reports", "Certificate issue", "Lab billing"],
  description: "Industry app for textile and garment testing labs.",
  domains: ["altexlabs.codexsun.com", "textile-lab.local"],
  port: 6040,
  title: "Textile Lab",
  transactionLinks: ["Service invoices", "Customer ledger", "File/certificate storage", "Mail delivery"],
})
