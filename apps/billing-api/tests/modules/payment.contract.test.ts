import { readFileSync } from 'node:fs'
import '../billing-api.contract.test.js'

const moduleSource = readFileSync('src/billing-api.module.ts', 'utf8')

if (!moduleSource.includes("'./modules/entries/payment/index.js'")) {
  throw new Error('Billing API must mount the native payment entry module from apps/billing-api.')
}

if (moduleSource.includes("'@cxsun/platform/modules/entries/payment/index.js'")) {
  throw new Error('Billing API must not mount the compatibility payment entry module after Phase 2 payment extraction.')
}

console.log('Payment module contract ok: native Billing API payment module is mounted.')
