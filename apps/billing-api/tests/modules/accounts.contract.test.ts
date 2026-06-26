import { readFileSync } from 'node:fs'
import '../billing-api.contract.test.js'

const moduleSource = readFileSync('src/billing-api.module.ts', 'utf8')

if (!moduleSource.includes("'./modules/accounts/index.js'")) {
  throw new Error('Billing API must mount the native accounts/report module from apps/billing-api.')
}

if (moduleSource.includes("'@cxsun/platform/modules/accounts/index.js'")) {
  throw new Error('Billing API must not mount the compatibility accounts module after Billing reports extraction.')
}

console.log('Accounts reports contract ok: native Billing API accounts module is mounted.')
