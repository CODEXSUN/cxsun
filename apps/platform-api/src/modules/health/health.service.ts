import 'reflect-metadata'
import { sql } from 'kysely'
import { Injectable } from '../../core/decorators/injectable.js'
import { settings } from '../../framework/config/index.js'
import { getDatabase } from '../../infrastructure/database/connection.js'

export interface HealthStatus {
  status: 'ok'
  service: 'platform-api'
  uptime: number
  timestamp: string
  version: string
}

export interface ReadyStatus extends HealthStatus {
  checks: {
    database: 'ok'
  }
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now()

  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'platform-api',
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      version: settings.package.version,
    }
  }

  async ready(): Promise<ReadyStatus> {
    await sql`SELECT 1`.execute(getDatabase())

    return {
      ...this.check(),
      checks: {
        database: 'ok',
      },
    }
  }
}
