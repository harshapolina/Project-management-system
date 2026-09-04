import { Children, isValidElement } from 'react'
import { motion } from 'framer-motion'
import { useMotion } from '../../lib/motion'

/** Subtle fade/rise. Use for empty states, headers, and short lists. */
export function FadeIn({
  children,
  delay = 0,
  y = 6,
  className,
  style,
  as: Tag = motion.div,
}) {
  const { reduced, uiTransition } = useMotion()
  return (
    <Tag
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...uiTransition, delay: reduced ? 0 : delay / 1000 }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  )
}

/**
 * Staggers the first few direct children. Caps so long lists don't cascade.
 */
export function Stagger({ children, from = 0, step = 25, cap = 8, className }) {
  const { reduced } = useMotion()
  const items = Children.toArray(children)
  return (
    <div className={className}>
      {items.map((child, i) => {
        if (!isValidElement(child)) return child
        const delay = reduced || i >= cap ? 0 : from + i * step
        return (
          <FadeIn key={child.key ?? i} delay={delay}>
            {child}
          </FadeIn>
        )
      })}
    </div>
  )
}
