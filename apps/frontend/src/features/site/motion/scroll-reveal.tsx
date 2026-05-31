import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export type ScrollRevealDirection = 'top' | 'bottom' | 'left' | 'right' | 'none'

interface ScrollRevealProps {
  amount?: number
  children: ReactNode
  className?: string
  delay?: number
  direction?: ScrollRevealDirection
  distance?: number
  duration?: number
  once?: boolean
}

export function ScrollReveal({
  amount = 0.2,
  children,
  className,
  delay = 0,
  direction = 'bottom',
  distance = 28,
  duration = 0.65,
  once = true,
}: ScrollRevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offsetForDirection(direction, distance) }}
      transition={{ delay, duration, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ amount, once }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
    >
      {children}
    </motion.div>
  )
}

function offsetForDirection(direction: ScrollRevealDirection, distance: number): { x?: number; y?: number } {
  if (direction === 'top') return { y: -distance }
  if (direction === 'bottom') return { y: distance }
  if (direction === 'left') return { x: -distance }
  if (direction === 'right') return { x: distance }
  return { x: 0, y: 0 }
}
