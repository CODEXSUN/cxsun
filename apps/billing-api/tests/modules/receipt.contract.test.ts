import { readFileSync } from 'node:fs'
import '../billing-api.contract.test.js'

const moduleSource = readFileSync('src/billing-api.module.ts', 'utf8')

if (!moduleSource.includes("'./modules/entries/receipt/index.js'")) {
  throw new Error('Billing API must mount the native receipt entry module from apps/billing-api.')
}

if (moduleSource.includes("'@cxsun/platform/modules/entries/receipt/index.js'")) {
  throw new Error('Billing API must not mount the compatibility receipt entry module after Phase 2 receipt extraction.')
}

console.log('Receipt module contract ok: native Billing API receipt module is mounted.')
