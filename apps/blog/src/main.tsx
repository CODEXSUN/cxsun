import { createProductApp } from "@cxsun/app-shell"
import "@cxsun/app-shell/styles.css"

createProductApp({
  appKey: "blog",
  appRoute: "/app/blog",
  audience: "Blog app for brand promotion, client stories, product updates, SEO articles, and publishing workflows.",
  capabilities: ["Posts", "Categories", "SEO metadata", "Publishing workflow"],
  description: "Blog and brand content app for owned and client promotion.",
  domains: ["blog.local"],
  port: 6038,
  title: "Blog",
  transactionLinks: ["Sites app", "Media/files", "Lead capture", "CRM handoff"],
})
