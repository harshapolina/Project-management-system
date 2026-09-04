import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export function useCollapsedFlyout(enabled) {
  const [tip, setTip] = useState(null)
  const hideTimer = useRef(null)

  const show = (next) => {
    if (!enabled || !next) return
    window.clearTimeout(hideTimer.current)
    setTip(next)
  }

  const hide = () => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setTip(null), 200)
  }

  const clear = () => {
    window.clearTimeout(hideTimer.current)
    setTip(null)
  }

  useEffect(() => {
    if (!enabled) clear()
    return () => window.clearTimeout(hideTimer.current)
  }, [enabled])

  useEffect(() => {
    if (!tip) return undefined
    const close = () => clear()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [tip])

  return { tip, show, hide, clear }
}

export function FlyoutAnchor({
  collapsed,
  flyout,
  id,
  label,
  to,
  href,
  icon,
  onNavigate,
  onSelect,
  children,
  className,
}) {
  const ref = useRef(null)

  const open = () => {
    if (!collapsed) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const estimatedHeight = 44
    const top = Math.max(
      12 + estimatedHeight / 2,
      Math.min(
        rect.top + rect.height / 2,
        window.innerHeight - 12 - estimatedHeight / 2,
      ),
    )
    flyout.show({
      id,
      label,
      to,
      href,
      icon,
      onNavigate,
      onSelect,
      top,
      left: rect.right + 14,
    })
  }

  return (
    <div
      ref={ref}
      className={cn('relative', className)}
      onMouseEnter={open}
      onMouseLeave={flyout.hide}
    >
      {children}
    </div>
  )
}

export function CollapsedFlyoutCard({ tip, flyout }) {
  const Icon = tip?.icon
  const keepOpen = () => {
    if (tip) flyout.show(tip)
  }
  const handleClick = () => {
    tip?.onNavigate?.()
    tip?.onSelect?.()
    flyout.clear()
  }

  const body = tip ? (
    <div className="flex items-center gap-2.5">
      {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : null}
      <span className="truncate">{tip.label}</span>
    </div>
  ) : null

  const cardClass =
    'relative flex min-w-[160px] max-w-[240px] items-center rounded-[8px] border border-border bg-surface px-3 py-2 text-[13px] font-medium text-primary shadow-[0_10px_28px_rgba(0,0,0,0.14)] hover:bg-surface-raised'

  let card = null
  if (tip?.to) {
    card = (
      <NavLink to={tip.to} onClick={handleClick} className={cardClass}>
        {body}
      </NavLink>
    )
  } else if (tip?.href) {
    card = (
      <a
        href={tip.href}
        target="_blank"
        rel="noreferrer"
        onClick={handleClick}
        className={cardClass}
      >
        {body}
      </a>
    )
  } else if (tip?.onSelect) {
    card = (
      <button type="button" onClick={handleClick} className={cn(cardClass, 'w-full text-left')}>
        {body}
      </button>
    )
  } else if (tip) {
    card = <div className={cardClass}>{body}</div>
  }

  return createPortal(
    <AnimatePresence>
      {tip ? (
        <motion.div
          key={tip.id || tip.label}
          className="fixed z-[200]"
          style={{ top: tip.top, left: tip.left }}
          initial={{ opacity: 0, y: 'calc(-50% - 4px)', scale: 0.98 }}
          animate={{ opacity: 1, y: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: 'calc(-50% - 4px)', scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={keepOpen}
          onMouseLeave={flyout.hide}
        >
          <div className="absolute -left-3.5 top-0 h-full w-3.5" />
          {card}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
