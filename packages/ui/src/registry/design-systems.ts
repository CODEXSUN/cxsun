import type { DashboardShellNavStyle, DashboardShellTone } from "../components/dashboard/dashboard-shell"

export type CxDesignSystemId =
  | "codexsun"
  | "billing"
  | "marketplace"
  | "neutral"
  | "emerald"
  | "orange"
  | "indigo"

export type CxDesignSystem = {
  description: string
  id: CxDesignSystemId
  label: string
  navStyle: DashboardShellNavStyle
  status: "default" | "active" | "preview"
  tone: DashboardShellTone
}

export const cxDesignSystems: CxDesignSystem[] = [
  {
    id: "codexsun",
    label: "Codexsun Default",
    description: "Default control UI for shared platform and product app dashboards.",
    navStyle: "billing",
    status: "default",
    tone: "blue",
  },
  {
    id: "billing",
    label: "Billing Admin",
    description: "Exact billing/admin shell tone with dark active menu and clean shadcn spacing.",
    navStyle: "billing",
    status: "active",
    tone: "neutral",
  },
  {
    id: "marketplace",
    label: "Marketplace Blue",
    description: "Tirupur Connect option-2 side menu hover with blue active rail.",
    navStyle: "option-2",
    status: "active",
    tone: "blue",
  },
  {
    id: "neutral",
    label: "Neutral Operations",
    description: "Low-colour operations UI for dense admin and audit desks.",
    navStyle: "billing",
    status: "preview",
    tone: "neutral",
  },
  {
    id: "emerald",
    label: "Growth Emerald",
    description: "Green-accent workspace for commerce, CRM, welfare, and service apps.",
    navStyle: "option-2",
    status: "preview",
    tone: "emerald",
  },
  {
    id: "orange",
    label: "Energy Orange",
    description: "Warm-accent workspace for sales, events, campaigns, and marketing desks.",
    navStyle: "option-2",
    status: "preview",
    tone: "orange",
  },
  {
    id: "indigo",
    label: "AI Indigo",
    description: "Indigo workspace for AI, automation, learning, and knowledge tools.",
    navStyle: "option-2",
    status: "preview",
    tone: "indigo",
  },
]

export const defaultDesignSystemId: CxDesignSystemId = "codexsun"

export function getCxDesignSystem(id?: string | null): CxDesignSystem {
  return cxDesignSystems.find((system) => system.id === id) ?? cxDesignSystems.find((system) => system.id === defaultDesignSystemId)!
}
