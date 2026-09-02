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
import { Avatar, toast, Tabs, SearchField, Button } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { PageLayout } from '../components/layout/PageLayout'
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
    <PageLayout className="flex h-full min-h-0 flex-col">
      <PageHeader title="Assigned Comments" />
      <Tabs
        tabs={TABS.map((t) => ({ value: t.id, label: t.label }))}
        value={scope}
        onChange={setScope}
        variant="underline"
        className="mb-0"
      />

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border py-2">
        <Button variant="ghost" size="pill" type="button" className="text-secondary">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </Button>

        <Button
          variant={showResolved ? 'secondary' : 'ghost'}
          size="pill"
          type="button"
          onClick={toggleResolved}
        >
          {showResolved ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-status-completed" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          Resolved
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="pill"
            type="button"
            onClick={() => setDaysOpen((v) => !v)}
          >
            <Calendar className="h-3.5 w-3.5" />
            {dayLabel}
          </Button>
          {daysOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close"
                onClick={() => setDaysOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl">
                {DAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDays(opt.value)}
                    className={cn(
                      'flex w-full px-3 py-1.5 text-left text-[12px]',
                      days === opt.value
                        ? 'bg-active text-primary'
                        : 'text-secondary hover:bg-active',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ml-auto w-[220px]">
          <SearchField
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch(searchDraft)
            }}
            onBlur={() => {
              if (searchDraft !== q) applySearch(searchDraft)
            }}
            placeholder="Search"
            className="h-8 text-[12px]"
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[88px] animate-pulse rounded-lg bg-surface-raised"
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
          <ul className="divide-y divide-border">
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
                      'group relative flex gap-3 px-2 py-4 transition-colors hover:bg-surface-raised',
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
                        <span className="font-medium text-primary">
                          {c.author?.name || 'Someone'}
                        </span>
                        {c.assignedTo && (
                          <span className="inline-flex items-center gap-1 rounded bg-active px-1.5 py-0.5 text-[11px] text-secondary">
                            <AtSign className="h-3 w-3 text-[#7c9cff]" />
                            {c.assignedTo.name}
                          </span>
                        )}
                        <span className="text-muted">
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

                      <p className="mt-1.5 text-[13px] leading-relaxed text-primary">
                        {highlightMentions(c.body)}
                      </p>

                      <Link
                        to={href}
                        className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[12px] text-secondary transition-colors hover:border-border hover:bg-surface-raised hover:text-primary"
                      >
                        <MessageSquare className="h-3 w-3 shrink-0 opacity-70" />
                        <span className="truncate font-medium text-primary">
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
                          ? 'text-status-completed hover:bg-active'
                          : 'text-secondary hover:bg-active hover:text-primary',
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
    </PageLayout>
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
        <div className="absolute inset-0 rounded-full bg-surface-raised" />
        <div className="absolute inset-2 rounded-full border border-border" />
        <UserRound className="relative h-7 w-7 text-muted" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-medium text-primary">No results found</p>
      <p className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-muted">
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
          className="mt-4 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-active"
        >
          Clear filters
        </button>
      )}
    </motion.div>
  )
}
