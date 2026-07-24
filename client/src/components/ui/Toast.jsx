import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export const useToastStore = create((set) => ({
  toasts: [],
  push: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, toast.duration ?? 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message, opts = {}) {
  useToastStore.getState().push({ message, ...opts })
}

const icons = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
}

export function ToastViewport() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.type || 'info'] || Info
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'flex items-start gap-3 rounded-[14px] border border-border bg-surface-raised px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)]',
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  t.type === 'success' && 'text-accent',
                  t.type === 'error' && 'text-status-delayed',
                  (!t.type || t.type === 'info') && 'text-secondary',
                )}
              />
              <p className="flex-1 text-sm text-primary">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-secondary hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
