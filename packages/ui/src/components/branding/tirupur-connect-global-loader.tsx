import { useEffect, useState } from "react"
import { TirupurConnectLogo } from "./tirupur-connect-logo"

export const TIRUPUR_CONNECT_LOADER_EVENT = "tirupur-connect:loader"

export function TirupurConnectGlobalLoader({
  eventName = TIRUPUR_CONNECT_LOADER_EVENT,
  label = "Loading Tirupur Connect",
}: {
  eventName?: string
  label?: string
}) {
  const [pending, setPending] = useState(1)

  useEffect(() => {
    const bootTimer = window.setTimeout(() => setPending((value) => Math.max(0, value - 1)), 520)

    function update(event: Event) {
      if (!(event instanceof CustomEvent)) return
      if (typeof event.detail === "number") {
        setPending((value) => Math.max(0, value + event.detail))
        return
      }
      if (event.detail && typeof event.detail === "object" && "active" in event.detail) {
        setPending(event.detail.active ? 1 : 0)
      }
    }

    window.addEventListener(eventName, update)
    return () => {
      window.clearTimeout(bootTimer)
      window.removeEventListener(eventName, update)
    }
  }, [eventName])

  if (pending <= 0) return null

  return (
    <div aria-label={label} className="tc-global-loader" role="status">
      <div className="tc-global-loader-ring">
        <div className="tc-global-loader-core" />
        <div className="tc-global-loader-orbit tc-global-loader-orbit-one" />
        <div className="tc-global-loader-orbit tc-global-loader-orbit-two" />
        <div className="tc-global-loader-orbit tc-global-loader-orbit-three" />
        <div className="tc-global-loader-orbit tc-global-loader-orbit-four" />
        <div className="tc-global-loader-logo">
          <TirupurConnectLogo variant="light" />
        </div>
      </div>
    </div>
  )
}
