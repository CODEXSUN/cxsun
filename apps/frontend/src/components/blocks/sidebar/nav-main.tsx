import type React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "src/components/ui/sidebar"

interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  defaultOpen?: boolean
  onSelect?: () => void
  items?: NavItem[]
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup className="p-0">
      <SidebarMenu className="gap-3">
        {items.map((item) => {
          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={item.isActive}
                  tooltip={item.title}
                  className="h-10 rounded-xl px-3 font-semibold transition-[background,color,box-shadow,transform] duration-300 hover:bg-sidebar-accent/80 hover:shadow-sm data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-sm [&_svg]:size-4"
                >
                  <a href={item.url} onClick={handleSelect(item.onSelect)}>
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.defaultOpen || item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="h-10 rounded-xl px-3 font-semibold transition-[background,color,box-shadow] duration-300 hover:bg-sidebar-accent/80 hover:shadow-sm data-[state=open]:bg-transparent [&_svg]:size-4"
                  >
                    {item.icon ? <item.icon /> : null}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <SidebarMenuSub className="mx-0 mt-1 gap-1 border-l-0 px-6 py-0 group-data-[collapsible=icon]:hidden">
                    {item.items.map((subItem) => <NestedSubItem key={subItem.title} item={subItem} />)}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NestedSubItem({ item }: { item: NavItem }) {
  const isParentActive = item.isActive || Boolean(item.items?.some(hasActiveItem))

  if (item.items?.length) {
    return (
      <Collapsible asChild defaultOpen={isParentActive} className="group/nested-collapsible">
        <SidebarMenuSubItem>
          <CollapsibleTrigger asChild>
            <button
              className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition-[background,color,box-shadow] duration-300 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-[state=open]:text-sidebar-accent-foreground [&_svg]:size-4"
              type="button"
            >
              {item.icon ? <item.icon /> : null}
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]/nested-collapsible:rotate-90" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            <SidebarMenuSub className="ml-4 mt-1 gap-1 border-l px-3 py-1">
              {item.items.map((child) => <NestedSubItem key={child.title} item={child} />)}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuSubItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        isActive={item.isActive}
        className="h-9 rounded-xl px-3 font-medium text-muted-foreground transition-[background,color,box-shadow] duration-300 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-sm [&_svg]:size-4"
      >
        <a href={item.url} onClick={handleSelect(item.onSelect)}>
          {item.icon ? <item.icon /> : null}
          <span>{item.title}</span>
        </a>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function hasActiveItem(item: NavItem): boolean {
  return Boolean(item.isActive || item.items?.some(hasActiveItem))
}

function handleSelect(onSelect?: () => void) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onSelect) {
      return
    }

    event.preventDefault()
    onSelect()
  }
}
