import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import {
  Inbox,
  Mail,
  Clock3,
  CheckCheck,
  Settings,
  Send,
  Search,
  UserPlus,
  Paperclip,
  Smile,
  AtSign,
  Plus,
  ArrowLeft,
} from 'lucide-react'
import { api, useAuthStore } from '../lib/api'
import { Avatar, toast } from '../components/ui'
import { cn } from '../lib/utils'

const TABS = [
  { id: 'primary', label: 'Primary', icon: Inbox },
  { id: 'mail', label: 'Company Mail', icon: Mail },
  { id: 'later', label: 'Later', icon: Clock3 },
  { id: 'cleared', label: 'Cleared', icon: CheckCheck },
]

const LATER_KEY = 'cubic-inbox-later'
const CLEARED_KEY = 'cubic-inbox-cleared'

function readIds(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function writeIds(key, ids) {
  localStorage.setItem(key, JSON.stringify(ids))
}

function useInboxBuckets() {
  const [laterIds, setLaterIds] = useState(() => readIds(LATER_KEY))
  const [clearedIds, setClearedIds] = useState(() => readIds(CLEARED_KEY))

  const snooze = (id) => {
    const next = [...new Set([id, ...laterIds])]
    setLaterIds(next)
    writeIds(LATER_KEY, next)
    toast('Saved for later', { type: 'success' })
  }

  const clearOne = (id) => {
    const next = [...new Set([id, ...clearedIds])]
    setClearedIds(next)
    writeIds(CLEARED_KEY, next)
    const later = laterIds.filter((x) => x !== id)
    setLaterIds(later)
    writeIds(LATER_KEY, later)
    toast('Cleared', { type: 'success' })
  }

  const restore = (id) => {
    const later = laterIds.filter((x) => x !== id)
    const cleared = clearedIds.filter((x) => x !== id)
    setLaterIds(later)
    setClearedIds(cleared)
    writeIds(LATER_KEY, later)
    writeIds(CLEARED_KEY, cleared)
  }

  return { laterIds, clearedIds, snooze, clearOne, restore }
}

export function InboxPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = params.get('tab') || 'mail'
  const withUser = params.get('with') || ''
  const compose = params.get('compose') === '1'
  const buckets = useInboxBuckets()

  const setTab = (id) => {
    const next = new URLSearchParams(params)
    next.set('tab', id)
    if (id !== 'mail') {
      next.delete('with')
      next.delete('compose')
    }
    setParams(next)
  }

  const openThread = (userId) => {
    const next = new URLSearchParams(params)
    next.set('tab', 'mail')
    next.delete('compose')
    if (userId) next.set('with', userId)
    else next.delete('with')
    setParams(next)
  }

  const setCompose = (open) => {
    const next = new URLSearchParams(params)
    next.set('tab', 'mail')
    if (open) {
      next.set('compose', '1')
      next.delete('with')
    } else {
      next.delete('compose')
    }
    setParams(next)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ClickUp-style inbox tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[#2e2e32] px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors',
              tab === t.id ? 'text-white' : 'text-[#8b8b90] hover:text-white',
            )}
          >
            <t.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t.label}
            {tab === t.id && (
              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-white" />
            )}
          </button>
        ))}
      </div>

      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[#2e2e32] px-4">
        <p className="text-[12px] text-[#6b6b70]">
          {tab === 'primary' && 'Workspace notifications'}
          {tab === 'mail' && 'Team messages'}
          {tab === 'later' && 'Snoozed for later'}
          {tab === 'cleared' && 'Recently cleared'}
        </p>
        <div className="ml-auto flex items-center gap-1">
          {tab === 'primary' && <MarkAllReadButton />}
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e]"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'primary' && <PrimaryNotifications buckets={buckets} />}
        {tab === 'mail' && (
          <CompanyMail
            withUserId={withUser}
            composeOpen={compose}
            onOpenThread={openThread}
            onComposeOpen={() => setCompose(true)}
            onComposeClose={() => setCompose(false)}
          />
        )}
        {tab === 'later' && (
          <PrimaryNotifications buckets={buckets} mode="later" />
        )}
        {tab === 'cleared' && (
          <PrimaryNotifications buckets={buckets} mode="cleared" />
        )}
      </div>
    </div>
  )
}

function MarkAllReadButton() {
  const qc = useQueryClient()
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await api('/notifications/read-all', { method: 'POST' })
          qc.invalidateQueries({ queryKey: ['notifications'] })
          toast('All marked read', { type: 'success' })
        } catch (e) {
          toast(e.message, { type: 'error' })
        }
      }}
      className="flex h-7 items-center rounded-md border border-[#2e2e32] px-2.5 text-[12px] text-[#c5c5c8] hover:bg-[#1c1c1e]"
    >
      Clear all
    </button>
  )
}

function PrimaryNotifications({ buckets, mode = 'primary' }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api('/notifications'),
  })

  const all = data?.notifications || []
  const items = useMemo(() => {
    if (mode === 'later') {
      return all.filter((n) => buckets.laterIds.includes(n._id))
    }
    if (mode === 'cleared') {
      return all.filter((n) => buckets.clearedIds.includes(n._id))
    }
    return all.filter(
      (n) =>
        !buckets.laterIds.includes(n._id) &&
        !buckets.clearedIds.includes(n._id),
    )
  }, [all, buckets.laterIds, buckets.clearedIds, mode])

  if (!items.length) {
    return (
      <EmptyInbox
        title={
          mode === 'later'
            ? 'Nothing saved for later'
            : mode === 'cleared'
              ? 'Cleared is empty'
              : 'Looking to collaborate?'
        }
        body={
          mode === 'later'
            ? 'Use Later on a notification to park it here.'
            : mode === 'cleared'
              ? 'Cleared notifications will appear here.'
              : 'Company mail lets you message anyone on the Cubic team.'
        }
        actionLabel={mode === 'primary' ? 'Open Company Mail' : undefined}
        actionTo={mode === 'primary' ? '/inbox?tab=mail' : undefined}
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {items.map((n) => (
        <div
          key={n._id}
          className="flex w-full items-start gap-3 border-b border-[#2e2e32]/50 px-5 py-3.5 hover:bg-[#1c1c1e]"
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
            onClick={async () => {
              if (!n.read) {
                await api(`/notifications/${n._id}/read`, { method: 'PATCH' })
                qc.invalidateQueries({ queryKey: ['notifications'] })
              }
            }}
          >
            <span
              className={cn(
                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                n.read ? 'bg-[#3a3a3e]' : 'bg-accent',
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{n.title}</p>
              <p className="mt-0.5 text-[12px] text-[#8b8b90]">{n.body}</p>
              <p className="mt-1 text-[11px] text-[#6b6b70]">
                {n.createdAt &&
                  formatDistanceToNow(new Date(n.createdAt), {
                    addSuffix: true,
                  })}
              </p>
            </div>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {n.link && (
              <Link
                to={n.link}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Open
              </Link>
            )}
            {mode === 'primary' && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => buckets.snooze(n._id)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => buckets.clearOne(n._id)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}
            {(mode === 'later' || mode === 'cleared') && (
              <button
                type="button"
                onClick={() => buckets.restore(n._id)}
                className="rounded px-1.5 py-0.5 text-[11px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
              >
                Restore
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function CompanyMail({
  withUserId,
  composeOpen,
  onOpenThread,
  onComposeOpen,
  onComposeClose,
}) {
  const me = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [pickerQuery, setPickerQuery] = useState('')

  const { data: dirData, isLoading: dirLoading } = useQuery({
    queryKey: ['mail-directory'],
    queryFn: () => api('/mail/directory'),
  })

  const { data: threadsData } = useQuery({
    queryKey: ['mail-threads'],
    queryFn: () => api('/mail/threads'),
    refetchInterval: 15000,
  })

  const people = dirData?.users || []
  const threads = threadsData?.threads || []

  const filteredPeople = useMemo(() => {
    if (!query.trim()) return people
    const q = query.toLowerCase()
    return people.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q),
    )
  }, [people, query])

  const pickerPeople = useMemo(() => {
    if (!pickerQuery.trim()) return people
    const q = pickerQuery.toLowerCase()
    return people.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q),
    )
  }, [people, pickerQuery])

  const activeId = withUserId
  const activeUser =
    people.find((u) => u._id === activeId) ||
    threads.find((t) => t.user?._id === activeId)?.user

  return (
    <div className="relative flex h-full min-h-0 flex-col md:flex-row">
      {/* Left: company directory + recent threads */}
      <div
        className={cn(
          'flex w-full shrink-0 flex-col border-[#2e2e32] bg-[#161618] md:max-w-[300px] md:border-r',
          activeId && activeUser ? 'hidden md:flex' : 'flex min-h-0 flex-1',
        )}
      >
        <div className="border-b border-[#2e2e32] p-3">
          <button
            type="button"
            onClick={onComposeOpen}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-accent py-2 text-[13px] font-semibold text-[#0E0E10] hover:bg-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            New message
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b6b70]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              className="h-8 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] pl-8 pr-2 text-[12px] outline-none placeholder:text-[#6b6b70]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {threads.length > 0 && (
            <>
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b6b70]">
                Recent
              </p>
              {threads.map((t) => (
                <PersonRow
                  key={t.user._id}
                  user={t.user}
                  preview={t.lastMessage?.body}
                  unread={t.unread}
                  active={activeId === t.user._id}
                  onClick={() => onOpenThread(t.user._id)}
                />
              ))}
            </>
          )}

          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#6b6b70]">
            Everyone at Cubic
          </p>
          {filteredPeople.map((u) => (
            <PersonRow
              key={u._id}
              user={u}
              active={activeId === u._id}
              onClick={() => onOpenThread(u._id)}
            />
          ))}
          {!filteredPeople.length && (
            <p className="px-3 py-4 text-[12px] text-[#6b6b70]">
              No teammates found.
            </p>
          )}
        </div>
      </div>

      {/* Right: thread / compose */}
      <div
        className={cn(
          'min-w-0 flex-1 flex-col bg-[#121214]',
          activeId && activeUser ? 'flex' : 'hidden md:flex',
        )}
      >
        {!activeId || !activeUser ? (
          <EmptyInbox
            title="Company mail"
            body="Pick anyone in Cubic Studio and send them a message — like internal company email."
            icon
          />
        ) : (
          <MailThread
            other={activeUser}
            me={me}
            onBack={() => onOpenThread('')}
          />
        )}
      </div>

      {composeOpen && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-black/50 p-4 pt-16">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-[#2e2e32] bg-[#1c1c1e] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2e2e32] px-4 py-3">
              <p className="text-[14px] font-semibold text-white">New message</p>
              <button
                type="button"
                onClick={onComposeClose}
                className="rounded-md px-2 py-1 text-[12px] text-[#8b8b90] hover:bg-[#252528] hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="border-b border-[#2e2e32] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b6b70]" />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Search teammates…"
                  className="h-9 w-full rounded-md border border-[#2e2e32] bg-[#161618] pl-8 pr-2 text-[13px] outline-none placeholder:text-[#6b6b70]"
                />
              </div>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {dirLoading && (
                <p className="px-4 py-6 text-center text-[12px] text-[#6b6b70]">
                  Loading people…
                </p>
              )}
              {!dirLoading &&
                pickerPeople.map((u) => (
                  <PersonRow
                    key={u._id}
                    user={u}
                    onClick={() => {
                      setPickerQuery('')
                      onOpenThread(u._id)
                    }}
                  />
                ))}
              {!dirLoading && pickerPeople.length === 0 && (
                <p className="px-4 py-6 text-center text-[12px] text-[#6b6b70]">
                  No teammates found. Invite people or seed demo users.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonRow({ user, preview, unread, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
        active ? 'bg-[#2a2a2e]' : 'hover:bg-[#1c1c1e]',
      )}
    >
      <Avatar src={user.avatar} name={user.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{user.name}</p>
          {unread > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-[#0E0E10]">
              {unread}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-[#6b6b70]">
          {preview ||
            `${(user.role || '').replace(/_/g, ' ')}${user.title ? ` · ${user.title}` : ''}`}
        </p>
      </div>
    </button>
  )
}

function MailThread({ other, me, onBack }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [subject, setSubject] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mail-thread', other._id],
    queryFn: () => api(`/mail/with/${other._id}`),
    refetchInterval: 8000,
  })

  const messages = data?.messages || []

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['mail-threads'] })
  }, [messages.length, qc])

  const send = useMutation({
    mutationFn: () =>
      api('/mail', {
        method: 'POST',
        body: JSON.stringify({
          to: other._id,
          body: text.trim(),
          subject: subject.trim(),
        }),
      }),
    onSuccess: () => {
      setText('')
      setSubject('')
      qc.invalidateQueries({ queryKey: ['mail-thread', other._id] })
      qc.invalidateQueries({ queryKey: ['mail-threads'] })
      toast('Message sent', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-[#2e2e32] px-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1 text-[#8b8b90] hover:bg-[#1c1c1e]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar src={other.avatar} name={other.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold">{other.name}</p>
          <p className="truncate text-[11px] text-[#6b6b70]">
            {other.email}
            {other.role ? ` · ${String(other.role).replace(/_/g, ' ')}` : ''}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && (
          <p className="text-center text-[12px] text-[#6b6b70]">Loading…</p>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="mb-3 h-10 w-10 text-[#3a3a3e]" />
            <p className="text-[14px] font-medium">Start the conversation</p>
            <p className="mt-1 max-w-xs text-[12px] text-[#6b6b70]">
              Send the first company mail to {other.name.split(' ')[0]}.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const mine = String(m.from?._id || m.from) === String(me?.id || me?._id)
          return (
            <div
              key={m._id}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2.5',
                  mine
                    ? 'rounded-br-md bg-accent text-[#0E0E10]'
                    : 'rounded-bl-md bg-[#1c1c1e] text-white border border-[#2e2e32]',
                )}
              >
                {m.subject && (
                  <p
                    className={cn(
                      'mb-1 text-[11px] font-semibold',
                      mine ? 'text-[#0E0E10]/70' : 'text-[#8b8b90]',
                    )}
                  >
                    {m.subject}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  {m.body}
                </p>
                <p
                  className={cn(
                    'mt-1 text-[10px]',
                    mine ? 'text-[#0E0E10]/55' : 'text-[#6b6b70]',
                  )}
                >
                  {formatMsgTime(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-[#2e2e32] p-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className="mb-2 h-8 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-3 text-[12px] outline-none placeholder:text-[#6b6b70]"
        />
        <div className="rounded-lg border border-[#2e2e32] bg-[#1c1c1e] focus-within:border-[#3a3a3e]">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={`Message ${other.name.split(' ')[0]}…`}
            className="w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] outline-none placeholder:text-[#6b6b70]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim()) {
                send.mutate()
              }
            }}
          />
          <div className="flex items-center gap-0.5 px-2 pb-2">
            <ToolIcon
              title="Attach link"
              onClick={() => {
                const url = window.prompt('Paste a file or link URL')
                if (!url?.trim()) return
                setText((t) => `${t}${t ? '\n' : ''}${url.trim()}`)
              }}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </ToolIcon>
            <ToolIcon
              title="Insert emoji"
              onClick={() => setText((t) => `${t} 🙂`)}
            >
              <Smile className="h-3.5 w-3.5" />
            </ToolIcon>
            <ToolIcon
              title="Mention"
              onClick={() =>
                setText((t) => `${t}${t.endsWith(' ') || !t ? '' : ' '}@`)
              }
            >
              <AtSign className="h-3.5 w-3.5" />
            </ToolIcon>
            <button
              type="button"
              disabled={!text.trim() || send.isPending}
              onClick={() => send.mutate()}
              className="ml-auto flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[12px] font-semibold text-[#0E0E10] hover:bg-accent-hover disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-[#6b6b70]">
          Ctrl/⌘ + Enter to send
        </p>
      </div>
    </>
  )
}

function ToolIcon({ children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#252528] hover:text-white"
    >
      {children}
    </button>
  )
}

function EmptyInbox({ title, body, actionLabel, actionTo, icon }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1c1c1e] text-[#8b8b90]">
        {icon ? (
          <Mail className="h-7 w-7" />
        ) : (
          <UserPlus className="h-7 w-7" />
        )}
      </div>
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-[13px] text-[#8b8b90]">{body}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-[#0E0E10] hover:bg-accent-hover"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

function formatMsgTime(d) {
  if (!d) return ''
  const date = new Date(d)
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`
  return format(date, 'MMM d, h:mm a')
}
