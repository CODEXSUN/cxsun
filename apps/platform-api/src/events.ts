export type PlatformEventSource = 'platform-api'
export type PlatformEventAudience = 'platform' | 'billing' | 'ecommerce' | 'crm' | 'sites' | 'cxsync'

export interface PlatformEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  type: string
  source: PlatformEventSource
  audience: PlatformEventAudience[]
  payload: TPayload
  occurredAt: string
  sync: PlatformSyncTags
}

export interface PlatformSyncTags {
  online: boolean
  offline: boolean
  mode: 'online-only' | 'offline-capable' | 'mirror-evidence'
}

export class PlatformEventBus {
  private readonly handlers = new Map<string, Array<(event: PlatformEvent) => Promise<void> | void>>()

  on(type: string, handler: (event: PlatformEvent) => Promise<void> | void) {
    const handlers = this.handlers.get(type) ?? []
    handlers.push(handler)
    this.handlers.set(type, handlers)
  }

  async publish(event: PlatformEvent) {
    for (const handler of this.handlers.get(event.type) ?? []) {
      await handler(event)
    }
  }
}

export function createPlatformEvent<TPayload extends Record<string, unknown>>(input: {
  type: string
  payload: TPayload
  audience?: PlatformEventAudience[]
  sync?: Partial<PlatformSyncTags>
}): PlatformEvent<TPayload> {
  return {
    id: crypto.randomUUID(),
    type: input.type,
    source: 'platform-api',
    audience: input.audience ?? ['platform'],
    payload: input.payload,
    occurredAt: new Date().toISOString(),
    sync: {
      online: input.sync?.online ?? true,
      offline: input.sync?.offline ?? false,
      mode: input.sync?.mode ?? 'online-only',
    },
  }
}
