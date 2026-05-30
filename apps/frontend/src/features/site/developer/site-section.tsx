import type { ElementType, ReactNode } from 'react'

import { cn } from 'src/lib/utils'

interface SiteSectionProps {
  as?: ElementType
  children: ReactNode
  className?: string
  developerMode: boolean
  name: string
}

export function SiteSection({
  as: Component = 'section',
  children,
  className,
  developerMode,
  name,
}: SiteSectionProps) {
  return (
    <Component className={cn('relative', className)} dev-data={name}>
      {developerMode ? (
        <span className="pointer-events-none absolute left-3 top-3 z-[80] rounded-md border border-purple-200 bg-purple-700 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-purple-950/25 ring-2 ring-purple-300/70">
          {name}
        </span>
      ) : null}
      {children}
    </Component>
  )
}
