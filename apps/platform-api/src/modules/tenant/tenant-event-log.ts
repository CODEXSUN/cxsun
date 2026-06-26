import { Injectable } from '../../core/decorators/injectable.js'
import type { PlatformEvent } from '../../events.js'

@Injectable()
export class TenantEventLog {
  private readonly events: PlatformEvent[] = []

  record(event: PlatformEvent) {
    this.events.unshift(event)
    if (this.events.length > 50) this.events.length = 50
  }

  recent() {
    return [...this.events]
  }
}
