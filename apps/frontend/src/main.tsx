import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './assets/css/index.css'
import App from './App.tsx'
import { GlobalLoader } from './components/blocks/loading/global-loader.tsx'
import { notifyAuthInvalid } from './features/auth/auth-client.ts'
import {
  agentOsApiBaseUrl,
  auditorApiBaseUrl,
  billingApiBaseUrl,
  blogApiBaseUrl,
  crmApiBaseUrl,
  frappeApiBaseUrl,
  platformApiBaseUrl,
  sitesApiBaseUrl,
  tallyApiBaseUrl,
  taskManagerApiBaseUrl,
} from './lib/api-base-url.ts'

function isAuthError(error: unknown) {
  return error instanceof Error && /\bstatus 401\b/i.test(error.message)
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAuthError(error)) notifyAuthInvalid()
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isAuthError(error)) notifyAuthInvalid()
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

const requireExtractedServices = import.meta.env.VITE_REQUIRE_EXTRACTED_SERVICES === 'true'
const serviceHealthChecks = {
  platform: { label: 'Platform API', url: `${platformApiBaseUrl}/health` },
  billing: { label: 'Billing API', url: `${billingApiBaseUrl}/health` },
  sites: { label: 'Sites API', url: `${sitesApiBaseUrl}/health` },
  crm: { label: 'CRM API', url: `${crmApiBaseUrl}/health` },
  tally: { label: 'Tally API', url: `${tallyApiBaseUrl}/health` },
  frappe: { label: 'Frappe API', url: `${frappeApiBaseUrl}/health` },
  'task-manager': { label: 'Task Manager API', url: `${taskManagerApiBaseUrl}/health` },
  auditor: { label: 'Auditor API', url: `${auditorApiBaseUrl}/health` },
  blog: { label: 'Blog API', url: `${blogApiBaseUrl}/health` },
  'agent-os': { label: 'Agent OS API', url: `${agentOsApiBaseUrl}/health` },
} as const
const requiredServiceKeys = String(import.meta.env.VITE_REQUIRED_API_SERVICES || 'platform,billing,sites')
  .split(',')
  .map((key) => key.trim())
  .filter((key): key is keyof typeof serviceHealthChecks => key in serviceHealthChecks)

function AppStartup() {
  const [servicesReady, setServicesReady] = useState(!requireExtractedServices)

  useEffect(() => {
    if (!requireExtractedServices) return

    let cancelled = false
    let timer: number | undefined

    async function checkServices() {
      const statuses = await Promise.all(
        requiredServiceKeys.map(async (key) => ({
          key,
          ready: await healthReady(serviceHealthChecks[key].url),
        })),
      )

      if (cancelled) return
      if (statuses.every((status) => status.ready)) {
        setServicesReady(true)
        return
      }

      timer = window.setTimeout(checkServices, 500)
    }

    void checkServices()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  return servicesReady ? <App /> : <GlobalLoader />
}

async function healthReady(url: string) {
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(2_000) })
    if (!response.ok) return false
    const result = await response.json() as { status?: string }
    return result.status === 'ok'
  } catch {
    return false
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppStartup />
    </QueryClientProvider>
  </StrictMode>,
)
