import '../billing-api.contract.test.js'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const moduleSource = readFileSync(resolve('src/billing-api.module.ts'), 'utf8')

if (!moduleSource.includes("./modules/stock/inward/purchase-receipt/index.js")) {
  throw new Error('Billing API must mount the native purchase receipt module.')
}

if (moduleSource.includes("@cxsun/platform/modules/stock/inward/purchase-receipt/index.js")) {
  throw new Error('Billing API must not mount the compatibility server purchase receipt module.')
}

console.log('Purchase receipt module contract ok: native Billing API purchase receipt module is mounted.')
