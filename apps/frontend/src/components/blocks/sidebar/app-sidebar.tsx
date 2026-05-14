"use client"

import * as React from "react"
import {
  Building2,
  BriefcaseBusiness,
  Factory,
  Home,
  Landmark,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react"

import { BrandLogo } from "src/components/blocks/branding/brand-logo"
import { CompanySwitcher } from "src/components/blocks/sidebar/company-switcher"
import { NavMain } from "src/components/blocks/sidebar/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "src/components/ui/sidebar"
import { APP_NAME } from "src/lib/branding"

const data = {
  companies: [
    {
      name: APP_NAME.toLowerCase(),
      logo: BrandLogo,
      period: "FY 2026-27",
    },
    {
      name: `${APP_NAME} Commerce`,
      logo: BrandLogo,
      period: "Operations",
    },
  ],
  navMain: [
    {
      title: "Overview",
      url: "#",
      icon: Home,
      isActive: true,
    },
    {
      title: "Organisation",
      url: "#",
      icon: Building2,
      defaultOpen: true,
      items: [
        {
          title: "Tenant",
          url: "#",
          icon: Users,
          isActive: true,
        },
        {
          title: "Industry",
          url: "#",
          icon: Factory,
        },
        {
          title: "Company",
          url: "#",
          icon: Building2,
        },
        {
          title: "Default Company",
          url: "#",
          icon: Landmark,
        },
      ],
    },
    {
      title: "Master",
      url: "#",
      icon: BriefcaseBusiness,
      items: [
        {
          title: "Catalog",
          url: "#",
        },
        {
          title: "Workflows",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Company Profile",
          url: "#",
        },
      ],
    },
    {
      title: "Admin",
      url: "#",
      icon: UserRoundCog,
      items: [
        {
          title: "Users",
          url: "#",
        },
        {
          title: "Roles",
          url: "#",
          icon: ShieldCheck,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader className="p-3 pb-2">
        <CompanySwitcher companies={data.companies} />
      </SidebarHeader>
      <SidebarSeparator className="mx-3" />
      <SidebarContent className="gap-3 px-3 py-6">
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}

