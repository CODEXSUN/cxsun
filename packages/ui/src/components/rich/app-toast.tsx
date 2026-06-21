import type { ReactNode } from "react"
import { CircleAlert, CircleCheckBig, Info, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { cn } from "../../lib/utils"

export type CxToastTone = "soft" | "solid"
export type CxAppToastVariant = "success" | "warning" | "error" | "info"

export type CxAppToastOptions = {
  variant: CxAppToastVariant
  title: string
  description: string
  duration?: number
  tone?: CxToastTone
}

export type CxRecordToastOptions = {
  variant?: CxAppToastVariant
  entity: string
  action: string
  recordName: string
  recordId?: string | null
  duration?: number
  tone?: CxToastTone
}

function getToastTone(tone?: CxToastTone): CxToastTone {
  if (tone) {
    return tone
  }

  if (typeof window === "undefined") {
    return "soft"
  }

  const settings = (window as Window & {
    __CODEXSUN_APP_SETTINGS__?: {
      uiFeedback?: {
        toast?: {
          tone?: CxToastTone
        }
      }
    }
  }).__CODEXSUN_APP_SETTINGS__

  return settings?.uiFeedback?.toast?.tone === "solid" ? "solid" : "soft"
}

function getVariantStyles(variant: CxAppToastVariant, tone: CxToastTone) {
  if (tone === "solid") {
    switch (variant) {
      case "success":
        return {
          wrapper:
            "border-emerald-700/70 bg-emerald-600 text-white shadow-[0_26px_55px_-34px_rgba(5,150,105,0.78)]",
          iconWrap: "bg-white/16 text-white",
          description: "text-emerald-50/90",
        }
      case "warning":
        return {
          wrapper:
            "border-amber-700/70 bg-amber-500 text-amber-950 shadow-[0_26px_55px_-34px_rgba(245,158,11,0.7)]",
          iconWrap: "bg-white/24 text-amber-950",
          description: "text-amber-950/80",
        }
      case "error":
        return {
          wrapper:
            "border-rose-700/70 bg-rose-600 text-white shadow-[0_26px_55px_-34px_rgba(225,29,72,0.75)]",
          iconWrap: "bg-white/16 text-white",
          description: "text-rose-50/90",
        }
      default:
        return {
          wrapper:
            "border-sky-700/70 bg-sky-600 text-white shadow-[0_26px_55px_-34px_rgba(2,132,199,0.72)]",
          iconWrap: "bg-white/16 text-white",
          description: "text-sky-50/90",
        }
    }
  }

  switch (variant) {
    case "success":
      return {
        wrapper:
          "border-emerald-200/80 bg-emerald-50/95 text-emerald-950 shadow-[0_24px_48px_-34px_rgba(16,185,129,0.45)]",
        iconWrap: "bg-emerald-600 text-white",
        description: "text-emerald-900/75",
      }
    case "warning":
      return {
        wrapper:
          "border-amber-200/90 bg-amber-50/95 text-amber-950 shadow-[0_24px_48px_-34px_rgba(245,158,11,0.42)]",
        iconWrap: "bg-amber-500 text-amber-950",
        description: "text-amber-900/75",
      }
    case "error":
      return {
        wrapper:
          "border-rose-200/85 bg-rose-50/95 text-rose-950 shadow-[0_24px_48px_-34px_rgba(244,63,94,0.42)]",
        iconWrap: "bg-rose-600 text-white",
        description: "text-rose-900/75",
      }
    default:
      return {
        wrapper:
          "border-sky-200/85 bg-sky-50/95 text-sky-950 shadow-[0_24px_48px_-34px_rgba(56,189,248,0.42)]",
        iconWrap: "bg-sky-600 text-white",
        description: "text-sky-900/75",
      }
  }
}

function getVariantIcon(variant: CxAppToastVariant) {
  switch (variant) {
    case "success":
      return CircleCheckBig
    case "warning":
      return TriangleAlert
    case "error":
      return CircleAlert
    default:
      return Info
  }
}

function CxAppToastCard({
  variant,
  title,
  description,
  tone,
}: CxAppToastOptions) {
  const resolvedTone = getToastTone(tone)
  const styles = getVariantStyles(variant, resolvedTone)
  const Icon = getVariantIcon(variant)

  return (
    <div
      className={cn(
        "flex w-[360px] items-start gap-3 rounded-[1.4rem] border px-4 py-3 backdrop-blur-xl",
        styles.wrapper
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl",
          styles.iconWrap
        )}
      >
        <Icon className="size-[18px]" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="line-clamp-1 text-sm font-semibold tracking-tight">{title}</p>
        <p className={cn("line-clamp-2 text-xs leading-5", styles.description)}>
          {description}
        </p>
      </div>
    </div>
  )
}

export function showCxAppToast(options: CxAppToastOptions) {
  return toast.custom(() => <CxAppToastCard {...options} />, {
    duration: options.duration ?? 3600,
  })
}

export function showCxRecordToast({
  action,
  entity,
  recordName,
  recordId,
  variant = "success",
  duration,
  tone,
}: CxRecordToastOptions) {
  const normalizedAction = action.trim() || "saved"
  const title = `${entity} ${normalizedAction} successful.`
  const idPart = recordId ? ` "id:${recordId}"` : ""
  const description = `The record "${recordName}" is ${normalizedAction.toLowerCase()}${idPart} successfully.`

  return showCxAppToast({
    variant,
    title,
    description,
    duration,
    tone,
  })
}

export function CxToastShowcase({
  variant,
  title,
  description,
  tone,
}: CxAppToastOptions) {
  return <CxAppToastCard variant={variant} title={title} description={description} tone={tone} />
}

export function CxInlineToastStack({
  children,
}: {
  children: ReactNode
}) {
  return <div className="flex w-full flex-col gap-3">{children}</div>
}
