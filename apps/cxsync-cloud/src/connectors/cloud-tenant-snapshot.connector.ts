import { Injectable } from '../../../server/src/core/decorators/injectable.js'

export interface CloudTenantSnapshotConnectorStatus {
  capabilities: string[]
  name: 'cloud-tenant-snapshot'
  ready: boolean
}

@Injectable()
export class CloudTenantSnapshotConnector {
  status(): CloudTenantSnapshotConnectorStatus {
    return {
      capabilities: [
        'tenant-auth-login',
        'tenant-session-verify',
        'cloud-schema-metadata',
        'cloud-row-estimates',
        'cloud-schema-hash',
      ],
      name: 'cloud-tenant-snapshot',
      ready: true,
    }
  }
}
