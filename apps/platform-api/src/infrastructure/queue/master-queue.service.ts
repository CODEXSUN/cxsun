import { Injectable } from '../../core/decorators/injectable.js'
import { getDatabase } from '../database/connection.js'
import { nowIso } from '../database/database-module.js'

export interface QueueJobInput {
  type: string
  payload: Record<string, unknown>
  runAt?: string
}

@Injectable()
export class MasterQueueService {
  async enqueue(input: QueueJobInput) {
    await getDatabase()
      .insertInto('queue_jobs')
      .values({
        queue_name: queueNameForJobType(input.type),
        type: input.type,
        payload: JSON.stringify(input.payload),
        status: 'pending',
        attempts: 0,
        progress: 0,
        run_at: input.runAt ?? nowIso(),
      })
      .execute()
  }

  listPending(limit = 20) {
    return getDatabase()
      .selectFrom('queue_jobs')
      .selectAll()
      .where('status', '=', 'pending')
      .orderBy('run_at', 'asc')
      .limit(limit)
      .execute()
  }
}

function queueNameForJobType(type: string) {
  if (type.includes('tenant.database')) return 'tenant-provisioning'
  if (type.includes('mail')) return 'mail'
  if (type.includes('notification')) return 'notifications'
  return 'events'
}
