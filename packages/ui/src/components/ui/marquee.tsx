import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { cn } from "../../lib/utils"

type MarqueeProps = ComponentPropsWithoutRef<"div"> & {
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  children: ReactNode
  vertical?: boolean
  repeat?: number
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 2,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group relative isolate flex w-full max-w-full gap-(--gap) overflow-x-clip overflow-y-visible p-2 [--duration:40s] [--gap:1rem] [contain:layout_paint]",
        vertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, index) => (
        <div
          key={index}
          className={cn("flex shrink-0 justify-around gap-(--gap) transform-gpu will-change-transform", {
            "animate-marquee flex-row": !vertical,
            "animate-marquee-vertical flex-col": vertical,
            "group-hover:[animation-play-state:paused]": pauseOnHover,
            "[animation-direction:reverse]": reverse,
          })}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
