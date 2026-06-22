import { Injectable } from '../../../server/src/core/decorators/injectable.js'

export interface SyncReporterStatus {
  name: 'sync-reporter'
  outputs: string[]
  ready: boolean
}

@Injectable()
export class SyncReporter {
  status(): SyncReporterStatus {
    return {
      name: 'sync-reporter',
      outputs: ['http-response', 'server-log'],
      ready: true,
    }
  }
}
