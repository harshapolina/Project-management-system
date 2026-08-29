import { useMutation } from '@tanstack/react-query'
import { Mail, Send, X, Paperclip } from 'lucide-react'
import { api } from '../lib/api'
import { useComposeEmailStore } from '../store/composeEmailStore'
import { Button, toast } from './ui'
import { cn } from '../lib/utils'

/**
 * Gmail-style compose popup: edit To / Subject / Body, then send via workspace SMTP.
 */
export function ComposeEmailModal() {
  const open = useComposeEmailStore((s) => s.open)
  const draft = useComposeEmailStore((s) => s.draft)
  const closeCompose = useComposeEmailStore((s) => s.closeCompose)
  const setDraft = useComposeEmailStore((s) => s.setDraft)

  const send = useMutation({
    mutationFn: () =>
      api('/settings/mail/compose', {
        method: 'POST',
        body: JSON.stringify({
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
        }),
      }),
    onSuccess: (res) => {
      toast(`Email sent to ${Array.isArray(res.sentTo) ? res.sentTo.join(', ') : res.sentTo}`, {
        type: 'success',
      })
      closeCompose()
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  if (!open) return null

  const canSend =
    draft.to.trim() && draft.subject.trim() && draft.body.trim() && !send.isPending

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close compose"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={closeCompose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.title || 'Compose email'}
        className={cn(
          'relative flex w-full max-w-[640px] flex-col overflow-hidden rounded-[16px] bg-surface shadow-[0_28px_80px_rgba(9,20,38,0.35)]',
          'max-h-[min(90vh,720px)]',
        )}
      >
        <div className="flex items-center gap-3 border-b border-border bg-[#f8fafc] px-4 py-3 dark:bg-surface-raised">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-primary">
              {draft.title || 'New message'}
            </p>
            <p className="text-[11px] text-secondary">
              Edit and send via your company SMTP
            </p>
          </div>
          <button
            type="button"
            onClick={closeCompose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary hover:bg-surface hover:text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-4 py-3">
          <FieldRow label="To">
            <input
              autoFocus
              value={draft.to}
              onChange={(e) => setDraft({ to: e.target.value })}
              placeholder="client@email.com"
              className="h-9 w-full bg-transparent text-[13px] text-primary outline-none placeholder:text-secondary"
            />
          </FieldRow>
          <FieldRow label="Subject">
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ subject: e.target.value })}
              placeholder="Subject"
              className="h-9 w-full bg-transparent text-[13px] text-primary outline-none placeholder:text-secondary"
            />
          </FieldRow>
          <div className="pt-2">
            <textarea
              rows={12}
              value={draft.body}
              onChange={(e) => setDraft({ body: e.target.value })}
              placeholder="Write your message…"
              className="min-h-[220px] w-full resize-y rounded-[10px] border border-border bg-surface-raised px-3 py-2.5 text-[13px] leading-relaxed text-primary outline-none focus:border-accent/40"
            />
          </div>
          <p className="flex items-center gap-1.5 pt-1 text-[11px] text-secondary">
            <Paperclip className="h-3 w-3 opacity-50" />
            Attachments coming soon — paste links in the body for now
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <Button type="button" variant="secondary" onClick={closeCompose}>
            Discard
          </Button>
          <Button
            type="button"
            loading={send.isPending}
            disabled={!canSend}
            onClick={() => send.mutate()}
          >
            <Send className="h-3.5 w-3.5" />
            Send email
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-1">
      <span className="w-14 shrink-0 text-[12px] font-medium text-secondary">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
