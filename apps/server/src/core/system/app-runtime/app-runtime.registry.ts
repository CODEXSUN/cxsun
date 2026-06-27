export type RuntimeAppKind = 'core'

export interface RuntimeAppDefinition {
  id: string
  kind: RuntimeAppKind
  name: string
  port: number
  route: string
  script?: string
}

export const runtimeApps: RuntimeAppDefinition[] = [
  { id: 'server', kind: 'core', name: 'Backend API', port: 6005, route: '/health' },
  { id: 'frontend', kind: 'core', name: 'Main App', port: 6010, route: '/sa/app-runtime', script: 'dev:frontend' },
]
