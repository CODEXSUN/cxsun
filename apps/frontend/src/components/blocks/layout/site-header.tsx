import { House } from "lucide-react"

import { Button } from "src/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "src/components/ui/breadcrumb"
import { Separator } from "src/components/ui/separator"
import { SidebarTrigger } from "src/components/ui/sidebar"
import { ThemeToggle } from "src/components/blocks/theme/theme-toggle"
import { APP_NAME } from "src/lib/branding"

interface SiteHeaderProps {
  onBackHome?: () => void
}

export function SiteHeader({ onBackHome }: SiteHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4 lg:px-5">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#" onClick={(event) => event.preventDefault()}>
                {APP_NAME}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <Button
            className="h-8 rounded-md px-2.5"
            onClick={onBackHome}
            size="sm"
            type="button"
            variant="ghost"
          >
            <House className="size-4" />
            <span>Home</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
