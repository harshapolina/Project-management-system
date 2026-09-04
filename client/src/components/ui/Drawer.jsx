import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { EASE_APPLE, useMotion } from '../../lib/motion'

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  className,
  width = 'max-w-md',
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const fromRight = side === 'right'
  const { reduced, modalTransition } = useMotion()

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={modalTransition}
            onClick={onClose}
          />
          <motion.aside
            className={cn(
              'absolute top-0 bottom-0 flex w-full flex-col bg-surface border-border shadow-[0_0_40px_rgba(0,0,0,0.45)]',
              fromRight ? 'right-0 border-l' : 'left-0 border-r',
              width,
              className,
            )}
            initial={reduced ? { opacity: 0 } : { x: fromRight ? '100%' : '-100%' }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { x: fromRight ? '100%' : '-100%' }}
            transition={{ ...modalTransition, ease: EASE_APPLE }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-secondary hover:text-primary hover:bg-surface-raised transition-colors duration-150"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
