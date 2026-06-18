export type RuntimeAppKind = 'core' | 'product'

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
  { id: 'docs', kind: 'core', name: 'Docs', port: 6020, route: '/docs', script: 'dev:docs' },
  { id: 'auditor', kind: 'product', name: 'Auditor Portal', port: 6030, route: '/app/auditor', script: 'dev:auditor' },
  { id: 'ecommerce', kind: 'product', name: 'Ecommerce', port: 6031, route: '/app/ecommerce', script: 'dev:ecommerce' },
  { id: 'b2b-connect', kind: 'product', name: 'B2B Connect', port: 6032, route: '/app/b2b-connect', script: 'dev:b2b-connect' },
  { id: 'sports', kind: 'product', name: 'Sports Club', port: 6033, route: '/app/sports', script: 'dev:sports' },
  { id: 'learning', kind: 'product', name: 'Learning Platform', port: 6034, route: '/app/learning', script: 'dev:learning' },
  { id: 'welfare', kind: 'product', name: 'Welfare Organization', port: 6035, route: '/app/welfare', script: 'dev:welfare' },
  { id: 'crm', kind: 'product', name: 'CRM', port: 6036, route: '/app/crm', script: 'dev:crm' },
  { id: 'sites', kind: 'product', name: 'Sites', port: 6037, route: '/app/sites', script: 'dev:sites' },
  { id: 'blog', kind: 'product', name: 'Blog', port: 6038, route: '/app/blog', script: 'dev:blog' },
  { id: 'zetro', kind: 'product', name: 'ZETRO', port: 6039, route: '/app/zetro', script: 'dev:zetro' },
  { id: 'textile-lab', kind: 'product', name: 'Textile Lab', port: 6040, route: '/app/textile-lab', script: 'dev:textile-lab' },
  { id: 'garment', kind: 'product', name: 'Garment Manufacturing', port: 6041, route: '/app/garment', script: 'dev:garment' },
  { id: 'upvc', kind: 'product', name: 'UPVC Manufacturing', port: 6042, route: '/app/upvc', script: 'dev:upvc' },
]
