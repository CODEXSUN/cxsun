import { AlertTriangle, RefreshCw, X } from "lucide-react"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "src/components/ui/alert"
import { Button } from "src/components/ui/button"

type ModuleErrorPanelProps = {
  error: unknown
  isRetrying?: boolean
  retryLabel?: string
  title?: string
  onRetry?: () => void
}

export function ModuleErrorPanel({ error, isRetrying = false, retryLabel = "Retry", title = "Could not load this section", onRetry }: ModuleErrorPanelProps) {
  const details = moduleErrorDetails(error)
  const isDismissAction = retryLabel.toLowerCase() === "dismiss"
  const ActionIcon = isDismissAction ? X : RefreshCw

  return (
    <Alert className="rounded-md border-destructive/30 bg-destructive/5 pr-28" variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>{details.title ?? title}</AlertTitle>
      <AlertDescription>
        <span className="block">{details.message}</span>
        {details.reason ? <span className="mt-1 block text-xs">Reason: {details.reason}</span> : null}
        {details.source ? <span className="mt-1 block text-xs">Source: {details.source}</span> : null}
      </AlertDescription>
      {onRetry ? (
        <AlertAction>
          <Button disabled={isRetrying} onClick={onRetry} size="sm" type="button" variant="outline">
            <ActionIcon className={!isDismissAction && isRetrying ? "size-3.5 animate-spin" : "size-3.5"} />
            {retryLabel}
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  )
}

function moduleErrorDetails(error: unknown): { message: string; reason?: string; source?: string; title?: string } {
  if (isErrorObject(error)) {
    const typed = nestedRecord(error)
    return {
      message: stringValue(typed.message) ?? error.message ?? "Please try again.",
      reason: optionalString(typed.reason) ?? optionalString(typed.lockReason),
      source: optionalString(typed.source) ?? optionalString(typed.lockSource),
      title: optionalString(typed.title),
    }
  }
  if (typeof error === "string") return { message: error }
  if (isRecord(error)) {
    return {
      message: stringValue(error.message) ?? stringValue(error.error) ?? "Please try again.",
      reason: optionalString(error.reason) ?? optionalString(error.lockReason),
      source: optionalString(error.source) ?? optionalString(error.lockSource),
      title: optionalString(error.title),
    }
  }
  return { message: "Please try again." }
}

function nestedRecord(error: Error): Record<string, unknown> {
  const cause = isRecord(error.cause) ? error.cause : {}
  return { ...cause, ...errorObjectRecord(error) }
}

function errorObjectRecord(error: Error): Record<string, unknown> {
  return isRecord(error) ? error : {}
}

function isErrorObject(value: unknown): value is Error {
  return value instanceof Error
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null
}

function optionalString(value: unknown) {
  return stringValue(value) ?? undefined
}
