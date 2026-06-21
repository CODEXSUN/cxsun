import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Home,
  LogOut,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "../ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"

export type DashboardShellTone = "blue" | "neutral" | "emerald" | "orange" | "indigo"
export type DashboardShellNavStyle = "billing" | "option-2"

export type DashboardShellUser = {
  actorType?: string
  avatarUrl?: string | null
  displayName: string
  email: string
  roleLabel?: string
}

export type DashboardShellApp = {
  description?: string
  icon: LucideIcon
  id: string
  name: string
  shortName?: string
}

export type DashboardShellNavItem<Page extends string = string> = {
  badge?: string | number
  icon: LucideIcon
  id: Page
  label: string
}

export type DashboardShellNavGroup<Page extends string = string> = {
  defaultOpen?: boolean
  icon?: LucideIcon
  id: string
  items: Array<DashboardShellNavItem<Page>>
  label: string
  standalone?: boolean
}

export type DashboardShellNotification = {
  body?: string
  createdAt?: string
  id: string
  isRead?: boolean
  title: string
}

type DashboardShellContextValue = {
  open: boolean
  setOpen(open: boolean): void
  toggle(): void
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null)

export function useDashboardShell() {
  const context = useContext(DashboardShellContext)
  if (!context) throw new Error("useDashboardShell must be used inside DashboardShell.")
  return context
}

export function DashboardShell<Page extends string>({
  activeAppId,
  activePage,
  appSwitcherLabel = "Switch app",
  apps = [],
  brand,
  children,
  className = "",
  homeHref = "/",
  navGroups,
  navStyle = "billing",
  notifications = [],
  onAppChange,
  onHome,
  onLogout,
  onNavigate,
  rightActions,
  showAppSwitcher = true,
  title,
  tone = "blue",
  user,
  version = "1.0.122",
}: {
  activeAppId?: string
  activePage: Page
  appSwitcherLabel?: string
  apps?: DashboardShellApp[]
  brand: { logo?: ReactNode; mark?: ReactNode; name: string; subtitle?: string }
  children: ReactNode
  className?: string
  homeHref?: string
  navGroups: Array<DashboardShellNavGroup<Page>>
  navStyle?: DashboardShellNavStyle
  notifications?: DashboardShellNotification[]
  onAppChange?: (appId: string) => void
  onHome?: () => void
  onLogout?: () => void
  onNavigate: (page: Page) => void
  rightActions?: ReactNode
  showAppSwitcher?: boolean
  title: string
  tone?: DashboardShellTone
  user: DashboardShellUser
  version?: string
}) {
  const [open, setOpen] = useState(true)
  const [appMenuOpen, setAppMenuOpen] = useState(false)
  const [noticeMenuOpen, setNoticeMenuOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">(() => readStoredTheme())
  const selectedApp = apps.find((app) => app.id === activeAppId) ?? apps[0]
  const unreadCount = notifications.filter((notification) => !notification.isRead).length
  const SelectedAppIcon = selectedApp?.icon

  useEffect(() => {
    document.documentElement.dataset.cxTheme = theme
    localStorage.setItem("cxsun-dashboard-theme", theme)
  }, [theme])

  const context = useMemo(() => ({
    open,
    setOpen,
    toggle: () => setOpen((value) => !value),
  }), [open])

  return (
    <DashboardShellContext.Provider value={context}>
      <SidebarProvider
        className={`cx-dashboard-shell tone-${tone} nav-${navStyle} ${open ? "" : "is-collapsed"} ${className}`}
        onOpenChange={setOpen}
        open={open}
        style={{
          "--sidebar-width": "250px",
          "--sidebar-width-icon": "48px",
        } as CSSProperties}
      >
        <TooltipProvider delayDuration={120}>
          <Sidebar className="cx-sidebar-root" collapsible="icon" variant="inset">
            <DashboardSidebar activePage={activePage} brand={brand} collapsed={!open} navGroups={navGroups} onLogout={onLogout} onNavigate={onNavigate} user={user} version={version} />
            <SidebarRail className="cx-sidebar-rail" />
          </Sidebar>
          <SidebarInset className="cx-dashboard-main">
          <header className="cx-dashboard-topbar">
            <div className="cx-menu-cell">
              <SidebarTrigger aria-label="Toggle sidebar" className="cx-icon-button cx-menu-button" />
            </div>
            <div className="cx-breadcrumb">
              {showAppSwitcher ? (
                <>
                  {selectedApp ? (
                    <div className="cx-app-switcher">
                      <button className="cx-app-trigger" onClick={() => setAppMenuOpen((value) => !value)} type="button">
                        {SelectedAppIcon ? <SelectedAppIcon size={16} /> : null}
                        <span>{selectedApp.shortName ?? selectedApp.name}</span>
                        <ChevronDown size={14} />
                      </button>
                      {appMenuOpen ? (
                        <div className="cx-popover cx-app-menu">
                          <small>{appSwitcherLabel}</small>
                          {apps.map((app) => {
                            const AppIcon = app.icon
                            return (
                              <button key={app.id} onClick={() => { setAppMenuOpen(false); onAppChange?.(app.id) }} type="button">
                                <span><AppIcon size={17} /></span>
                                <span><strong>{app.name}</strong>{app.description ? <em>{app.description}</em> : null}</span>
                                {app.id === selectedApp.id ? <Check size={16} /> : null}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : <span>{brand.name}</span>}
                  <i>/</i>
                </>
              ) : null}
              <strong>{title}</strong>
            </div>
            <div className="cx-topbar-actions">
              {notifications.length ? (
                <div className="cx-notification-menu">
                  <button aria-label="Notifications" className="cx-icon-button" onClick={() => setNoticeMenuOpen((value) => !value)} type="button">
                    <Bell size={17} />
                    {unreadCount ? <b>{unreadCount > 9 ? "9+" : unreadCount}</b> : null}
                  </button>
                  {noticeMenuOpen ? <NotificationPopover notifications={notifications} /> : null}
                </div>
              ) : null}
              <button className="cx-topbar-link" onClick={onHome} type="button"><Home size={16} />Home</button>
              <a className="cx-topbar-link cx-topbar-home-link" href={homeHref}><Home size={16} />Open</a>
              <ThemeSwitch theme={theme} onTheme={setTheme} />
              {rightActions}
              <button className="cx-topbar-link" onClick={onLogout} type="button"><LogOut size={16} />Logout</button>
            </div>
          </header>
          <section className="cx-work-area">{children}</section>
          </SidebarInset>
        </TooltipProvider>
      </SidebarProvider>
    </DashboardShellContext.Provider>
  )
}

function DashboardSidebar<Page extends string>({
  activePage,
  brand,
  collapsed,
  navGroups,
  onLogout,
  onNavigate,
  user,
  version,
}: {
  activePage: Page
  brand: { logo?: ReactNode; mark?: ReactNode; name: string; subtitle?: string }
  collapsed: boolean
  navGroups: Array<DashboardShellNavGroup<Page>>
  onLogout?: () => void
  onNavigate: (page: Page) => void
  user: DashboardShellUser
  version: string
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => Object.fromEntries(
    navGroups.map((group) => [
      group.id,
      group.defaultOpen === true || group.items.some((item) => item.id === activePage),
    ]),
  ))

  useEffect(() => {
    const activeGroup = navGroups.find((group) => group.items.some((item) => item.id === activePage))
    if (activeGroup) {
      setOpenGroups((current) => current[activeGroup.id] ? current : { ...current, [activeGroup.id]: true })
    }
  }, [activePage, navGroups])

  return (
    <div className="cx-sidebar">
      <div className="cx-brand-card">
        <span className="cx-brand-mark">{brand.logo ?? brand.mark ?? initials(brand.name)}</span>
        <span className="cx-brand-copy"><strong>{brand.name}</strong><small>{brand.subtitle ?? user.roleLabel ?? user.actorType}</small></span>
        <ChevronDown className="cx-brand-chevron" size={15} />
      </div>
      <div className="cx-sidebar-separator" />
      <nav className="cx-sidebar-nav">
        {navGroups.map((group) => {
          const GroupIcon = group.icon
          const groupOpen = openGroups[group.id] ?? true
          const groupActive = group.items.some((item) => item.id === activePage)
          if (group.standalone) {
            return (
              <section className="cx-nav-group cx-nav-standalone" key={group.id}>
                <div className="cx-nav-items cx-nav-standalone-items">
                  <div className="cx-nav-items-inner">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <button className={activePage === item.id ? "active" : ""} onClick={() => onNavigate(item.id)} type="button">
                              <Icon size={17} />
                              <span>{item.label}</span>
                              {item.badge ? <b>{item.badge}</b> : null}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="cx-sidebar-tooltip" hidden={!collapsed} side="right" sideOffset={8}>{item.label}</TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              </section>
            )
          }
          return (
            <section className={`cx-nav-group ${groupOpen ? "is-open" : ""}`} key={group.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-expanded={groupOpen}
                    className={`cx-nav-heading ${groupActive ? "has-active" : ""}`}
                    onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !groupOpen }))}
                    type="button"
                  >
                    {GroupIcon ? <GroupIcon size={16} /> : null}
                    <span>{group.label}</span>
                    <ChevronRight className="cx-nav-chevron" size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="cx-sidebar-tooltip" hidden={!collapsed} side="right" sideOffset={8}>{group.label}</TooltipContent>
              </Tooltip>
              <div className="cx-nav-items">
                <div className="cx-nav-items-inner">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          <button className={activePage === item.id ? "active" : ""} onClick={() => onNavigate(item.id)} type="button">
                            <Icon size={17} />
                            <span>{item.label}</span>
                            {item.badge ? <b>{item.badge}</b> : null}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="cx-sidebar-tooltip" hidden={!collapsed} side="right" sideOffset={8}>{item.label}</TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </section>
          )
        })}
      </nav>
      <div className="cx-sidebar-footer">
        <small className="cx-sidebar-version">v {version}</small>
        <button className="cx-sidebar-user" onClick={onLogout} type="button">
          <span>{user.avatarUrl ? <img alt="" src={user.avatarUrl} /> : initials(user.displayName)}</span>
          <span><strong>{user.displayName}</strong><small>{user.email}</small></span>
          <ChevronsUpDown className="cx-user-chevron" size={15} />
        </button>
      </div>
    </div>
  )
}

function NotificationPopover({ notifications }: { notifications: DashboardShellNotification[] }) {
  return (
    <div className="cx-popover cx-notification-popover">
      <small>Notifications</small>
      {notifications.length ? notifications.map((notification) => (
        <article key={notification.id}>
          <i className={notification.isRead ? "" : "unread"} />
          <span>
            <strong>{notification.title}</strong>
            {notification.body ? <em>{notification.body}</em> : null}
            {notification.createdAt ? <time>{formatDate(notification.createdAt)}</time> : null}
          </span>
        </article>
      )) : <p>No actionable notifications right now.</p>}
    </div>
  )
}

export function ThemeSwitch({ onTheme, theme }: { onTheme: (theme: "light" | "dark") => void; theme: "light" | "dark" }) {
  return (
    <button aria-label="Toggle theme" className="cx-icon-button" onClick={() => onTheme(theme === "dark" ? "light" : "dark")} type="button">
      {theme === "dark" ? <Moon size={17} /> : <Sun size={17} />}
    </button>
  )
}

export function DashboardGlobalLoader({ active, label = "Loading" }: { active: boolean; label?: string }) {
  if (!active) return null
  return (
    <div className="cx-global-loader">
      <div className="cx-loader-orbit"><span /><span /><span /></div>
      <p>{label}</p>
    </div>
  )
}

function readStoredTheme(): "light" | "dark" {
  if (typeof localStorage === "undefined") return "light"
  return localStorage.getItem("cxsun-dashboard-theme") === "dark" ? "dark" : "light"
}

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}
