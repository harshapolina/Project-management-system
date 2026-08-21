import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  Circle,
  MessageSquare,
  AtSign,
  ChevronRight,
  UserRound,
} from 'lucide-react'
import { api, useAuthStore } from '../lib/api'
import { Avatar, toast } from '../components/ui'
import { cn } from '../lib/utils'

const TABS = [
  { id: 'to_me', label: 'Assigned to me' },
  { id: 'by_me', label: 'Delegated by me' },
]

const DAY_OPTIONS = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '365', label: 'Last Year' },
]

function highlightMentions(text) {
  if (!text) return null
  const parts = text.split(/(@[\w.\s]+?)(?=\s|$|[.,!?;:])/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-medium text-[#7c9cff]">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export function AssignedCommentsPage() {
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const scope = params.get('scope') === 'by_me' ? 'by_me' : 'to_me'
  const showResolved = params.get('resolved') === 'true'
  const days = params.get('days') || '90'
  const [q, setQ] = useState(params.get('q') || '')
  const [searchDraft, setSearchDraft] = useState(q)
  const [daysOpen, setDaysOpen] = useState(false)

  const setScope = (id) => {
    const next = new URLSearchParams(params)
    next.set('scope', id)
    setParams(next)
  }

  const toggleResolved = () => {
    const next = new URLSearchParams(params)
    if (showResolved) next.delete('resolved')
    else next.set('resolved', 'true')
    setParams(next)
  }

  const setDays = (value) => {
    const next = new URLSearchParams(params)
    next.set('days', value)
    setParams(next)
    setDaysOpen(false)
  }

  const applySearch = (value) => {
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    setParams(next)
    setQ(value.trim())
  }

  const clearFilters = () => {
    setParams(new URLSearchParams({ scope }))
    setSearchDraft('')
    setQ('')
  }

  const queryKey = ['assigned-comments', scope, showResolved, days, q]
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => {
      const sp = new URLSearchParams({
        scope,
        days,
        resolved: showResolved ? 'true' : 'false',
      })
      if (q) sp.set('q', q)
      return api(`/comments/assigned?${sp}`)
    },
  })

  const comments = data?.comments || []

  const resolveMut = useMutation({
    mutationFn: ({ id, resolved }) =>
      api(`/comments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assigned-comments'] })
      toast('Updated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const dayLabel = useMemo(
    () => DAY_OPTIONS.find((d) => d.value === days)?.label || 'Last 90 Days',
    [days],
  )

  const hasActiveFilters = showResolved || days !== '90' || !!q

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#121214]">
      <div className="shrink-0 border-b border-[#2e2e32] px-6 pb-0 pt-5">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="text-[22px] font-semibold tracking-tight text-white"
        >
          Assigned Comments
        </motion.h1>

        <div className="mt-4 flex items-center gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScope(t.id)}
              className={cn(
                'relative px-3 pb-3 text-[13px] font-medium transition-colors',
                scope === t.id
                  ? 'text-white'
                  : 'text-[#8b8b90] hover:text-white',
              )}
            >
              {t.label}
              {scope === t.id && (
                <motion.span
                  layoutId="assigned-tab"
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-surface"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-10 shrink-0 items-center gap-1.5 border-b border-[#2e2e32] px-4">
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>

        <button
          type="button"
          onClick={toggleResolved}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] transition-colors',
            showResolved
              ? 'bg-[#252528] text-white'
              : 'text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white',
          )}
        >
          {showResolved ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          Resolved
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setDaysOpen((v) => !v)}
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            <Calendar className="h-3.5 w-3.5" />
            {dayLabel}
          </button>
          {daysOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close"
                onClick={() => setDaysOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-[#2e2e32] bg-[#1c1c1e] py-1 shadow-xl">
                {DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDays(opt.value)}
                    className={cn(
                      'flex w-full px-3 py-1.5 text-left text-[12px]',
                      days === opt.value
                        ? 'bg-[#252528] text-white'
                        : 'text-[#c5c5c8] hover:bg-[#252528]',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ml-auto flex h-7 w-[200px] items-center gap-1.5 rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 focus-within:border-[#3a3a3e]">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#6b6b70]" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch(searchDraft)
            }}
            onBlur={() => {
              if (searchDraft !== q) applySearch(searchDraft)
            }}
            placeholder="Search"
            className="w-full bg-transparent text-[12px] outline-none placeholder:text-[#6b6b70]"
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[88px] animate-pulse rounded-lg bg-[#1c1c1e]"
              />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
            scope={scope}
            meName={me?.name?.split(' ')[0]}
          />
        ) : (
          <ul className="divide-y divide-[#2e2e32]/70">
            <AnimatePresence initial={false}>
              {comments.map((c, i) => {
                const task = c.taskId
                const projectId =
                  typeof task?.projectId === 'object'
                    ? task.projectId?._id
                    : task?.projectId
                const projectName =
                  typeof task?.projectId === 'object'
                    ? task.projectId?.name
                    : null
                const href =
                  projectId && task?._id
                    ? `/projects/${projectId}/tasks?task=${task._id}`
                    : '#'

                return (
                  <motion.li
                    key={c._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.2) }}
                    className={cn(
                      'group relative flex gap-3 px-5 py-4 transition-colors hover:bg-[#161618]',
                      c.resolved && 'opacity-60',
                      isFetching && 'opacity-80',
                    )}
                  >
                    <Avatar
                      src={c.author?.avatar}
                      name={c.author?.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                        <span className="font-medium text-white">
                          {c.author?.name || 'Someone'}
                        </span>
                        {c.assignedTo && (
                          <span className="inline-flex items-center gap-1 rounded bg-[#252528] px-1.5 py-0.5 text-[11px] text-[#8b8b90]">
                            <AtSign className="h-3 w-3 text-[#7c9cff]" />
                            {c.assignedTo.name}
                          </span>
                        )}
                        <span className="text-[#6b6b70]">
                          {c.createdAt
                            ? formatDistanceToNow(new Date(c.createdAt), {
                                addSuffix: true,
                              })
                            : ''}
                        </span>
                        {c.resolved && (
                          <span className="text-[11px] text-emerald-400/90">
                            Resolved
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#d4d4d8]">
                        {highlightMentions(c.body)}
                      </p>

                      <Link
                        to={href}
                        className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[12px] text-[#8b8b90] transition-colors hover:border-[#2e2e32] hover:bg-[#1c1c1e] hover:text-white"
                      >
                        <MessageSquare className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="truncate font-medium text-[#c5c5c8]">
                          {task?.title || 'Task'}
                        </span>
                        {projectName && (
                          <>
                            <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
                            <span className="truncate">{projectName}</span>
                          </>
                        )}
                      </Link>
                    </div>

                    <button
                      type="button"
                      title={c.resolved ? 'Reopen' : 'Resolve'}
                      onClick={() =>
                        resolveMut.mutate({
                          id: c._id,
                          resolved: !c.resolved,
                        })
                      }
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100',
                        c.resolved
                          ? 'text-emerald-400 hover:bg-[#252528]'
                          : 'text-[#8b8b90] hover:bg-[#252528] hover:text-white',
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}

function EmptyState({ hasFilters, onClear, scope, meName }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full min-h-[360px] flex-col items-center justify-center px-6 text-center"
    >
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#1c1c1e]" />
        <div className="absolute inset-2 rounded-full border border-[#2e2e32]" />
        <UserRound className="relative h-7 w-7 text-[#6b6b70]" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-medium text-[#c5c5c8]">No results found</p>
      <p className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-[#6b6b70]">
        {hasFilters
          ? 'Try clearing filters or widening the date range.'
          : scope === 'by_me'
            ? 'Comments you assign to others with @mentions will show up here.'
            : `When someone tags ${meName || 'you'} on a task, or comments on your tasks, they’ll appear here.`}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#252528]"
        >
          Clear filters
        </button>
      )}
    </motion.div>
  )
}
