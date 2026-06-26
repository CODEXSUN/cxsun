import { motion } from "framer-motion"

import { cn } from "src/lib/utils"

const ringTransition = {
  ease: "linear",
  repeat: Infinity,
} as const

export function GlobalLoader({
  className,
  fullScreen = true,
}: {
  className?: string
  fullScreen?: boolean
}) {
  return (
    <div
      className={cn(
        "z-[100] flex flex-col items-center justify-center gap-4 bg-background/55 p-6 text-foreground backdrop-blur-md",
        fullScreen ? "fixed inset-0 min-h-svh" : "min-h-[320px] w-full",
        className,
      )}
    >
      <div className="relative size-42 shrink-0" role="status" aria-label="Loading">
        <div
          className="absolute inset-[22%] rounded-full border border-border/70 shadow-sm"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--background) 65%, var(--primary) 35%) 0%, color-mix(in oklab, var(--card) 92%, var(--secondary) 8%) 58%, color-mix(in oklab, var(--card) 84%, var(--accent) 16%) 100%)",
            boxShadow:
              "0 0 0 1px color-mix(in oklab, var(--border) 88%, transparent), 0 24px 48px color-mix(in oklab, var(--primary) 16%, transparent)",
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          className="absolute inset-0 rounded-full"
          transition={{ ...ringTransition, duration: 3 }}
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, var(--accent) 90deg, transparent 180deg)",
            mask: "radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)",
            opacity: 0.8,
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          className="absolute inset-0 rounded-full"
          transition={{ ...ringTransition, duration: 2.5 }}
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--foreground) 90%, var(--primary) 10%) 120deg, color-mix(in oklab, var(--foreground) 48%, transparent) 240deg, transparent 360deg)",
            mask: "radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)",
            opacity: 0.9,
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          className="absolute inset-0 rounded-full"
          transition={{ ...ringTransition, duration: 4 }}
          style={{
            background:
              "conic-gradient(from 180deg, transparent 0deg, color-mix(in oklab, var(--foreground) 58%, transparent) 45deg, transparent 90deg)",
            mask: "radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)",
            opacity: 0.35,
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          className="absolute inset-0 rounded-full"
          transition={{ ...ringTransition, duration: 3.5 }}
          style={{
            background:
              "conic-gradient(from 270deg, transparent 0deg, color-mix(in oklab, var(--foreground) 38%, transparent) 20deg, transparent 40deg)",
            mask: "radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)",
            WebkitMask:
              "radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)",
            opacity: 0.5,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            alt=""
            aria-hidden="true"
            className="size-10 object-contain"
            src="/logo.svg"
          />
        </div>
      </div>
    </div>
  )
}
