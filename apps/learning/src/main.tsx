import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "learning",
  appRoute: "/app/learning",
  audience: "Learning platform for courses, batches, learners, fees, material publishing, and student communication.",
  capabilities: ["Course catalog", "Batch management", "Student fees", "Learning material"],
  description: "Learning platform app for NEOT and future education clients.",
  domains: ["neot.in", "www.neot.in"],
  port: 6034,
  title: "Learning Platform",
  transactionLinks: ["Course fee invoices", "Receipt posting", "Student ledger", "Mail notifications"],
})
