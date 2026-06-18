import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "sports",
  appRoute: "/app/sports",
  audience: "Sports club operating app for students, memberships, attendance, events, batches, coaches, and fee collection.",
  capabilities: ["Student master", "Membership fees", "Attendance", "Events and batches"],
  description: "Sports club app for Tenkasi Sports and future club clients.",
  domains: ["tenkasisports.com", "www.tenkasisports.com"],
  port: 6033,
  title: "Sports Club",
  transactionLinks: ["Fee invoices", "Receipt posting", "Member ledger", "Mail/SMS notices"],
})
