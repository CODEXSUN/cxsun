import { readFileSync } from 'node:fs'
import '../billing-api.contract.test.js'

const moduleSource = readFileSync('src/billing-api.module.ts', 'utf8')

if (!moduleSource.includes("'./modules/entries/export-sales/index.js'")) {
  throw new Error('Billing API must mount the native export sales entry module from apps/billing-api.')
}

if (moduleSource.includes("'@cxsun/platform/modules/entries/export-sales/index.js'")) {
  throw new Error('Billing API must not mount the compatibility export sales entry module after Phase 2 export sales extraction.')
}

console.log('Export Sales module contract ok: native Billing API export sales module is mounted.')
