import logoDarkUrl from 'src/assets/logo/logo-dark.svg'
import logoUrl from 'src/assets/logo/logo.svg'

import { APP_NAME } from 'src/lib/branding'
import { cn } from 'src/lib/utils'

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <img
        alt={APP_NAME}
        className="size-full object-contain dark:hidden"
        draggable={false}
        src={logoUrl}
      />
      <img
        alt={APP_NAME}
        className="hidden size-full object-contain dark:block"
        draggable={false}
        src={logoDarkUrl}
      />
    </span>
  )
}
