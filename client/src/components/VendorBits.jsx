import { Send, Star } from 'lucide-react'
import { poWhatsappLink } from '../lib/phone'
import { toast } from './ui'
import { cn } from '../lib/utils'

/** 1–5 star strip, e.g. for vendor ratings. */
export function Stars({ value = 0, className }) {
  return (
    <span className={cn('inline-flex items-center gap-px', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'h-3.5 w-3.5',
            n <= Math.round(Number(value) || 0)
              ? 'fill-amber-400 text-amber-400'
              : 'text-[#dbe3ec]',
          )}
        />
      ))}
    </span>
  )
}

/** Green button that WhatsApps the PO item list to the PO's vendor. */
export function SendPoButton({ po, className }) {
  const hasPhone = !!po?.vendor?.phone
  return (
    <button
      type="button"
      title={
        hasPhone
          ? `WhatsApp this order to ${po.vendor?.name}`
          : 'Add a phone number to this vendor to send the list'
      }
      onClick={(e) => {
        e.stopPropagation()
        const url = poWhatsappLink(po)
        if (!url) {
          toast('This vendor has no phone number — add it in the vendor directory', {
            type: 'error',
          })
          return
        }
        window.open(url, '_blank', 'noopener')
      }}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-white shadow-sm transition',
        hasPhone
          ? 'bg-[#25D366] hover:bg-[#1fb958]'
          : 'bg-[#a7dcbb] hover:bg-[#98d2ad]',
        className,
      )}
    >
      <Send className="h-3 w-3" />
      Send
    </button>
  )
}
