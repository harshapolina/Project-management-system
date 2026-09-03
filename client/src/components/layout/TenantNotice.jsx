import { useEffect, useState } from 'react'
import { AlertTriangle, Info, Lock, X } from 'lucide-react'
import { useAuthStore } from '../../lib/api'
import { cn } from '../../lib/utils'

const VARIANTS = {
  info: {
    icon: Info,
    bar: 'bg-surface-raised border-border',
    accent: 'text-secondary',
  },
  warning: {
    icon: AlertTriangle,
    bar: 'bg-status-review/10 border-status-review/30',
    accent: 'text-status-review',
  },
  urgent: {
    icon: AlertTriangle,
    bar: 'bg-status-delayed/10 border-status-delayed/30',
    accent: 'text-status-delayed',
  },
}

/**
 * Dismissal is per-device and per-message.
 *
 * Keyed on the notice's `updatedAt` so re-wording it makes it reappear for
 * everyone who had waved the previous one away — otherwise a chased customer
 * dismisses once and never sees the follow-up.
 */
function dismissKey(stamp) {
  return `cubic-notice-dismissed:${stamp || 'none'}`
}

function readDismissed(stamp) {
  try {
    return localStorage.getItem(dismissKey(stamp)) === '1'
  } catch {
    return false
  }
}

/**
 * A message the platform owner is showing this company.
 *
 * Two shapes. A banner sits above the app and can usually be dismissed. A
 * blocking notice covers the app entirely and cannot — that is the payment
 * wall, and the only way past it is the platform owner lifting it.
 */
export function TenantNotice() {
  const tenant = useAuthStore((s) => s.tenant)
  const notice = tenant?.notice
  // The stamp is the whole identity of a message here — re-wording it produces
  // a new stamp, which re-shows it to everyone who dismissed the previous one.
  const stamp = notice?.updatedAt || 'none'
  const [dismissed, setDismissed] = useState(() => readDismissed(stamp))

  useEffect(() => {
    setDismissed(readDismissed(stamp))
  }, [stamp])

  if (!notice?.message && !notice?.title) return null

  const variant = VARIANTS[notice.variant] || VARIANTS.info
  const Icon = notice.blocking ? Lock : variant.icon

  if (notice.blocking) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tenant-lock-title"
        className="fixed inset-0 z-[100] grid place-items-center bg-canvas/95 p-6 backdrop-blur-sm"
      >
        <div className="w-full max-w-md rounded-[14px] border border-border bg-surface p-6 text-center shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-status-delayed/12">
            <Lock className="h-5 w-5 text-status-delayed" />
          </span>
          <h2
            id="tenant-lock-title"
            className="mt-3.5 text-[17px] font-semibold text-primary"
          >
            {notice.title || 'This workspace is on hold'}
          </h2>
          {notice.message && (
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-secondary">
              {notice.message}
            </p>
          )}
          <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted">
            Access returns as soon as this is lifted. Contact your account manager
            if you believe this is a mistake.
          </p>
        </div>
      </div>
    )
  }

  if (dismissed) return null

  return (
    <div
      role="status"
      className={cn('flex items-start gap-3 border-b px-4 py-2.5 print:hidden', variant.bar)}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', variant.accent)} />
      <div className="min-w-0 flex-1">
        {notice.title && (
          <p className="text-[13px] font-semibold text-primary">{notice.title}</p>
        )}
        {notice.message && (
          <p className="whitespace-pre-line text-[12px] leading-relaxed text-secondary">
            {notice.message}
          </p>
        )}
      </div>
      {notice.dismissible && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            try {
              localStorage.setItem(dismissKey(stamp), '1')
            } catch {
              /* private mode — it just reappears next load */
            }
            setDismissed(true)
          }}
          className="shrink-0 rounded p-1 text-muted transition hover:text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
