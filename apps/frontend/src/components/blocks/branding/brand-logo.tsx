import logoDarkUrl from 'src/assets/logo/logo-dark.svg'
import logoUrl from 'src/assets/logo/logo.svg'

import { APP_NAME } from 'src/lib/branding'
import { cn } from 'src/lib/utils'

interface BrandLogoProps {
  className?: string
  fallback?: boolean
  logoDarkUrl?: string
  logoUrl?: string
  name?: string
}

export function BrandLogo({ className, fallback = true, logoDarkUrl: tenantLogoDarkUrl, logoUrl: tenantLogoUrl, name = APP_NAME }: BrandLogoProps) {
  const lightSrc = tenantLogoUrl || (fallback ? logoUrl : "")
  const darkSrc = tenantLogoDarkUrl || tenantLogoUrl || (fallback ? logoDarkUrl : "")

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {lightSrc ? (
        <img
          alt={name}
          className="size-full object-contain dark:hidden"
          draggable={false}
          onError={(event) => {
            if (fallback && event.currentTarget.src !== logoUrl) {
              event.currentTarget.src = logoUrl
              return
            }
            event.currentTarget.removeAttribute("src")
          }}
          src={lightSrc}
        />
      ) : null}
      {darkSrc ? (
        <img
          alt={name}
          className="hidden size-full object-contain dark:block"
          draggable={false}
          onError={(event) => {
            if (fallback && event.currentTarget.src !== logoDarkUrl) {
              event.currentTarget.src = logoDarkUrl
              return
            }
            event.currentTarget.removeAttribute("src")
          }}
          src={darkSrc}
        />
      ) : null}
    </span>
  )
}
