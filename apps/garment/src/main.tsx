import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "garment",
  appRoute: "/app/garment",
  audience: "Garment manufacturing app for orders, cutting, stitching, job work, size/color flow, production, dispatch, and billing.",
  capabilities: ["Work orders", "Production stages", "Size/color tracking", "Dispatch billing"],
  description: "Industry app for garment manufacturing and garment-simple billing clients.",
  domains: ["garment.local"],
  port: 6041,
  title: "Garment Manufacturing",
  transactionLinks: ["Sales/purchase invoices", "Inventory consumption", "Job work ledgers", "Production reports"],
})
