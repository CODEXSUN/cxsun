import { Menu, X } from 'lucide-react'

import { BrandLogo } from 'src/components/blocks/branding/brand-logo'
import { ThemeToggle } from 'src/components/blocks/theme/theme-toggle'
import { Button } from 'src/components/ui/button'
import { cn } from 'src/lib/utils'
import { APP_NAME } from 'src/lib/branding'
import { isSiteDeveloperMode } from './developer/developer-mode'
import { SiteSection } from './developer/site-section'
import { HomePage } from './home/home'
import type { HealthStatus, SiteContent, TenantStaticSiteContent } from './domain/site-content'

interface PublicSitePageProps {
  activePage: string
  content: SiteContent
  health: HealthStatus | null
  menuOpen: boolean
  tenantSite: TenantStaticSiteContent | null
  version: string
  onNavigate(page: string): void
  onOpenDashboard(): void
  onOpenLogin(): void
  onToggleMenu(): void
}

export function PublicSitePage({
  activePage,
  content,
  health,
  menuOpen,
  tenantSite,
  version,
  onNavigate,
  onOpenDashboard,
  onOpenLogin,
  onToggleMenu,
}: PublicSitePageProps) {
  const developerMode = isSiteDeveloperMode()
  const nav = content.pages.map((item) => (
    <button
      className={cn(
        'rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground',
        activePage === item.slug && 'bg-muted text-foreground',
      )}
      key={item.slug}
      onClick={() => onNavigate(item.slug)}
      type="button"
    >
      {item.nav_label}
    </button>
  ))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteSection
        as="header"
        className="sticky top-0 z-20 border-b bg-card/92 backdrop-blur"
        developerMode={developerMode}
        name="header"
      >
        <div className="cx-container flex h-16 items-center justify-between gap-4">
          <button className="flex items-center gap-3 text-left" onClick={() => onNavigate('home')} type="button">
            <BrandLogo className="size-9" />
            <span>
              <strong className="block leading-tight">{tenantSite?.tenant?.name ?? APP_NAME}</strong>
              <small className="text-muted-foreground">v{version}</small>
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Top menu">
            {nav}
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={onOpenDashboard}
              type="button"
            >
              Dashboard
            </button>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={onOpenLogin}
              type="button"
            >
              Login
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground sm:flex">
              <span
                className={cn(
                  'h-2 w-2 rounded-full bg-destructive',
                  health?.status === 'ok' && 'bg-secondary',
                )}
              />
              API {health?.status ?? 'offline'}
            </div>
            {tenantSite?.resolved && tenantSite.apps ? (
              <div className="hidden rounded-lg border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground lg:block">
                {tenantSite.apps.landing} app
              </div>
            ) : null}
            <ThemeToggle />
            <Button className="md:hidden" onClick={onToggleMenu} size="icon" type="button" variant="outline">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="cx-container grid gap-2 border-t py-3 md:hidden">
            {nav}
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={onOpenDashboard}
              type="button"
            >
              Dashboard
            </button>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              onClick={onOpenLogin}
              type="button"
            >
              Login
            </button>
          </nav>
        ) : null}
      </SiteSection>

      <HomePage developerMode={developerMode} tenantSite={tenantSite} />

      <SiteSection as="footer" className="border-t bg-card py-8" developerMode={developerMode} name="footer">
        <div className="cx-container flex flex-col justify-between gap-4 text-sm text-muted-foreground md:flex-row md:items-center">
          <p>(c) 2026 {APP_NAME}. ERP + ecommerce platform foundation.</p>
          <nav className="flex flex-wrap gap-3">
            {content.pages
              .filter((item) => item.slug !== 'home')
              .map((item) => (
                <button
                  className="font-semibold hover:text-foreground"
                  key={item.slug}
                  onClick={() => onNavigate(item.slug)}
                  type="button"
                >
                  {item.nav_label}
                </button>
            ))}
          </nav>
        </div>
      </SiteSection>
    </div>
  )
}
