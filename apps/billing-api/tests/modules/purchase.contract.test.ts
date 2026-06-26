import { readFileSync } from 'node:fs'
import '../billing-api.contract.test.js'

const moduleSource = readFileSync('src/billing-api.module.ts', 'utf8')

if (!moduleSource.includes("'./modules/entries/purchase/index.js'")) {
  throw new Error('Billing API must mount the native purchase entry module from apps/billing-api.')
}

if (moduleSource.includes("'@cxsun/platform/modules/entries/purchase/index.js'")) {
  throw new Error('Billing API must not mount the compatibility purchase entry module after Phase 2 purchase extraction.')
}

console.log('Purchase module contract ok: native Billing API purchase module is mounted.')
