import '../billing-api.contract.test.js'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const moduleSource = readFileSync(resolve('src/billing-api.module.ts'), 'utf8')

if (!moduleSource.includes("./modules/stock/outward/delivery-note/index.js")) {
  throw new Error('Billing API must mount the native delivery note module.')
}

if (moduleSource.includes("@cxsun/platform/modules/stock/outward/delivery-note/index.js")) {
  throw new Error('Billing API must not mount the compatibility server delivery note module.')
}

console.log('Delivery note module contract ok: native Billing API delivery note module is mounted.')
