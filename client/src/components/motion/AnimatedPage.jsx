import { useNavigationType, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { routeTransitionKey, useMotion } from '../../lib/motion'

/**
 * Subtle iOS-style enter for each top-level route.
 * Enter-only (no exit wait) so React Router never blanks the shell,
 * duplicates pages, or loses scroll on nested outlets.
 */
export function AnimatedPage({ children }) {
  const location = useLocation()
  const navType = useNavigationType()
  const motionSys = useMotion()
  const dir = navType === 'POP' ? -1 : 1
  const key = routeTransitionKey(location.pathname)

  return (
    <motion.div
      key={key}
      custom={dir}
      variants={motionSys.page}
      initial="initial"
      animate="animate"
      transition={motionSys.pageTransition}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  )
}
