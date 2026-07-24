import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDays,
  addMinutes,
  differenceInMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  setHours,
  setMinutes,
  startOfWeek,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  CheckSquare,
  Plus,
  X,
  Video,
  MapPin,
  AlignLeft,
  Users,
  Clock,
  Trash2,
} from 'lucide-react'
import { api } from '../lib/api'
import { toast } from '../components/ui'
import { TaskDetailPanel } from './project/TaskDetailPanel'
import { getGcalSession, fetchAllGoogleEvents } from '../lib/googleCalendar'
import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 6am–11pm
const SLOT_H = 56 // px per hour

export function PlannerPage() {
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const filter = params.get('filter') || 'all'
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState(null)
  const [projectOpen, setProjectOpen] = useState(null)
  const [composer, setComposer] = useState(null)
  const plannerCreateTick = useUiStore((s) => s.plannerCreateTick)
  const [draggingId, setDraggingId] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const rangeSelectRef = useRef(null)
  const dayColRefs = useRef({})
  const overlayRefs = useRef({})
  const didDragRef = useRef(false)

  const weekStart = useMemo(
    () => startOfWeek(anchor, { weekStartsOn: 0 }),
    [anchor],
  )
  const weekEnd = useMemo(
    () => endOfWeek(anchor, { weekStartsOn: 0 }),
    [anchor],
  )
  const days = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  )

  const { data: homeData, isFetching, refetch } = useQuery({
    queryKey: ['home'],
    queryFn: () => api('/home'),
    staleTime: 30_000,
  })

  const tasks = homeData?.data?.tasks || {}
  const gcalSession = getGcalSession()

  const { data: gcalEvents = [] } = useQuery({
    queryKey: ['planner-gcal', gcalSession?.accessToken],
    queryFn: async () => {
      if (!gcalSession?.accessToken) return []
      const { events } = await fetchAllGoogleEvents(gcalSession.accessToken, 14)
      return events
    },
    enabled: !!gcalSession?.accessToken,
    staleTime: 60_000,
  })

  const allMyTasks = useMemo(() => {
    const map = new Map()
    for (const t of [
      ...(tasks.assigned || []),
      ...(tasks.today || []),
      ...(tasks.overdue || []),
      ...(tasks.next || []),
      ...(tasks.unscheduled || []),
      ...(tasks.personal || []),
      ...(tasks.priorities || []),
    ]) {
      map.set(t._id, t)
    }
    return [...map.values()]
  }, [tasks])

  const plannerTasks = useMemo(() => {
    let list = allMyTasks
    if (filter === 'assigned') list = tasks.assigned || []
    if (filter === 'today') {
      list = [...(tasks.today || []), ...(tasks.overdue || [])]
    }
    if (filter === 'priority') {
      list = (tasks.priorities || []).length
        ? tasks.priorities
        : list.filter((t) => t.priority === 'urgent' || t.priority === 'high')
    }
    return list
  }, [allMyTasks, tasks, filter])

  const scheduled = useMemo(
    () => plannerTasks.filter((t) => t.dueDate || t.startDate),
    [plannerTasks],
  )
  const unscheduled = useMemo(
    () => plannerTasks.filter((t) => !t.dueDate && !t.startDate),
    [plannerTasks],
  )

  const taskStart = (t) => new Date(t.startDate || t.dueDate)
  const taskEnd = (t) => {
    if (t.startDate && t.dueDate && new Date(t.dueDate) > new Date(t.startDate)) {
      return new Date(t.dueDate)
    }
    return addMinutes(taskStart(t), 60)
  }

  const { allDayByDay, timedByDay } = useMemo(() => {
    const allDayByDay = new Map()
    const timedByDay = new Map()
    for (const day of days) {
      allDayByDay.set(day.toISOString(), [])
      timedByDay.set(day.toISOString(), [])
    }
    for (const t of scheduled) {
      const start = taskStart(t)
      const end = taskEnd(t)
      const key = days.find((d) => isSameDay(start, d))?.toISOString()
      if (!key) continue
      const mins = differenceInMinutes(end, start)
      if (mins >= 8 * 60) allDayByDay.get(key).push(t)
      else timedByDay.get(key).push(t)
    }
    return { allDayByDay, timedByDay }
  }, [scheduled, days])

  const eventsByDayMap = useMemo(() => {
    const map = new Map()
    for (const day of days) map.set(day.toISOString(), [])
    for (const e of gcalEvents) {
      if (!e.start || e.allDay) continue
      const start = new Date(e.start)
      const key = days.find((d) => isSameDay(start, d))?.toISOString()
      if (key) map.get(key).push(e)
    }
    return map
  }, [gcalEvents, days])

  const scheduleTask = useMutation({
    mutationFn: ({ id, startDate, dueDate }) =>
      api(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ startDate, dueDate }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home'] })
      toast('Scheduled — synced to My Tasks', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const createScheduled = useMutation({
    mutationFn: (body) =>
      api('/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home'] })
      setComposer(null)
      toast('Added — visible in My Tasks & Planner', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const deleteTask = useMutation({
    mutationFn: (id) => api(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home'] })
      setSelected(null)
      toast('Deleted from Planner & My Tasks', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const openTask = (task) => {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    setSelected(task)
  }

  const setFilter = (f) => {
    const next = new URLSearchParams(params)
    if (f === 'all') next.delete('filter')
    else next.set('filter', f)
    setParams(next, { replace: true })
  }

  const openComposer = (day, startHourDec, endHourDec, extra = {}) => {
    const startH = Math.floor(startHourDec)
    const startM = Math.round((startHourDec - startH) * 60)
    const endH = Math.floor(endHourDec)
    const endM = Math.round((endHourDec - endH) * 60)
    let start = setMinutes(setHours(day, startH), startM)
    let end = setMinutes(setHours(day, endH), endM)
    if (end <= start) end = addMinutes(start, 30)
    setComposer({
      day,
      start,
      end,
      tab: 'task',
      ...extra,
    })
  }

  useEffect(() => {
    if (!plannerCreateTick) return
    const now = new Date()
    const startH = now.getHours() + Math.floor(now.getMinutes() / 15) * 0.25
    const prefillIds = useUiStore.getState().plannerPrefill?.participantIds || []
    openComposer(
      now,
      startH,
      startH + 1,
      prefillIds.length ? { participantIds: prefillIds } : {},
    )
    if (prefillIds.length) {
      useUiStore.getState().setPlannerPrefill({ participantIds: [] })
    }
  }, [plannerCreateTick])

  const yToHour = (clientY, dayIso) => {
    const el = dayColRefs.current[dayIso]
    if (!el) return HOURS[0]
    const rect = el.getBoundingClientRect()
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height - 1))
    const raw = HOURS[0] + y / SLOT_H
    const snapped = Math.round(raw * 4) / 4
    return Math.min(
      HOURS[HOURS.length - 1] + 0.75,
      Math.max(HOURS[0], snapped),
    )
  }

  const paintOverlay = (cur) => {
    if (!cur) return
    const el = overlayRefs.current[cur.dayIso]
    if (!el) return
    const startHour = Math.min(cur.startHour, cur.endHour)
    const endHour = Math.max(cur.startHour, cur.endHour)
    el.style.display = 'block'
    el.style.top = `${(startHour - HOURS[0]) * SLOT_H}px`
    el.style.height = `${Math.max((endHour - startHour) * SLOT_H, 14)}px`
    const sh = Math.floor(startHour)
    const sm = Math.round((startHour % 1) * 60)
    const eh = Math.floor(endHour)
    const em = Math.round((endHour % 1) * 60)
    el.textContent = `${format(setMinutes(setHours(cur.day, sh), sm), 'h:mm a')} – ${format(setMinutes(setHours(cur.day, eh), em), 'h:mm a')}`
  }

  const hideOverlays = () => {
    for (const el of Object.values(overlayRefs.current)) {
      if (el) el.style.display = 'none'
    }
  }

  const beginRangeSelect = (e, day) => {
    if (e.button !== 0) return
    if (draggingId) return
    if (e.target.closest('[data-cal-block]')) return
    e.preventDefault()
    const dayIso = day.toISOString()
    const hour = yToHour(e.clientY, dayIso)
    const next = {
      day,
      dayIso,
      origin: hour,
      startHour: hour,
      endHour: hour + 0.25,
    }
    rangeSelectRef.current = next
    hideOverlays()
    paintOverlay(next)
    setIsSelecting(true)
  }

  useEffect(() => {
    if (!isSelecting) return undefined

    const onMove = (e) => {
      const cur = rangeSelectRef.current
      if (!cur) return
      const hour = yToHour(e.clientY, cur.dayIso)
      const startHour = Math.min(cur.origin, hour)
      const endHour = Math.max(cur.origin, hour)
      const next = {
        ...cur,
        startHour,
        endHour: endHour === startHour ? startHour + 0.25 : endHour,
      }
      rangeSelectRef.current = next
      paintOverlay(next)
    }

    const onUp = () => {
      const cur = rangeSelectRef.current
      rangeSelectRef.current = null
      hideOverlays()
      setIsSelecting(false)
      if (!cur) return
      if (Math.abs(cur.endHour - cur.origin) < 0.2) return
      const startHour = Math.min(cur.startHour, cur.endHour)
      let endHour = Math.max(cur.startHour, cur.endHour)
      if (endHour - startHour < 0.25) endHour = startHour + 0.5
      openComposer(cur.day, startHour, endHour)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
    }
  }, [isSelecting])

  const onDropToColumn = (e, day) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('planner-drag-over')
    const id = e.dataTransfer.getData('text/task-id') || draggingId
    if (!id) return
    const dayIso = day.toISOString()
    const hourDec = yToHour(e.clientY, dayIso)
    const startH = Math.floor(hourDec)
    const startM = Math.round((hourDec % 1) * 60)
    const start = setMinutes(setHours(day, startH), startM)
    const end = addMinutes(start, 60)
    scheduleTask.mutate({
      id,
      startDate: start.toISOString(),
      dueDate: end.toISOString(),
    })
    setDraggingId(null)
  }

  const onDragStartTask = (e, taskId) => {
    e.dataTransfer.setData('text/task-id', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(taskId)
    didDragRef.current = true
  }

  const GRID_H = HOURS.length * SLOT_H
  const HOUR_LABELS = useMemo(
    () =>
      HOURS.map((hour) =>
        format(setMinutes(setHours(new Date(), hour), 0), 'h a'),
      ),
    [],
  )

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#121214]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#2e2e32] px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAnchor((d) => addDays(d, -7))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-md px-2 py-1 text-[12px] text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor((d) => addDays(d, 7))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h1 className="text-[15px] font-semibold text-white">
          {format(anchor, 'MMMM yyyy')}
        </h1>

        <span className="rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2.5 py-1 text-[12px] text-[#c5c5c8]">
          Week
        </span>

        <button
          type="button"
          onClick={() => {
            const h = new Date().getHours() + new Date().getMinutes() / 60
            openComposer(new Date(), h, h + 1)
          }}
          className="ml-2 flex h-7 items-center gap-1 rounded-md bg-[#7B68EE] px-2.5 text-[12px] font-semibold text-white hover:bg-[#6a58d9]"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/?view=assigned"
            className="relative flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
            title="My tasks"
          >
            <CheckSquare className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
            />
          </button>
          <Link
            to="/settings"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8b8b90] hover:bg-[#1c1c1e] hover:text-white"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-[#2e2e32] px-4 py-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'assigned', label: 'Assigned to me' },
          { id: 'today', label: 'Today & overdue' },
          { id: 'priority', label: 'Priorities' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
              filter === f.id
                ? 'bg-[#2a2a2e] text-white'
                : 'text-[#8b8b90] hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-[11px] text-[#6b6b70]">
          Drag on the grid to set a time · drop tasks onto a slot
        </span>
      </div>

      {unscheduled.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[#2e2e32] bg-[#161618] px-3 py-2">
          <span className="shrink-0 text-[11px] font-medium text-[#8b8b90]">
            Unscheduled
          </span>
          {unscheduled.slice(0, 12).map((t) => (
            <div
              key={t._id}
              draggable
              onDragStart={(e) => onDragStartTask(e, t._id)}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => openTask(t)}
              className="max-w-[180px] shrink-0 cursor-grab truncate rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 py-1 text-[11px] text-[#e8e8ea] active:cursor-grabbing hover:border-[#7B68EE]"
            >
              {t.title}
            </div>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {/* Day headers */}
        <div className="sticky top-0 z-10 flex border-b border-[#2e2e32] bg-[#121214]">
          <div className="w-14 shrink-0 border-r border-[#2e2e32]" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="min-w-0 flex-1 border-r border-[#2e2e32] px-2 py-2 text-center last:border-r-0"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#6b6b70]">
                {format(day, 'EEE')}
              </p>
              <p
                className={cn(
                  'mx-auto mt-1 flex h-7 w-7 items-center justify-center text-[14px] font-semibold',
                  isToday(day)
                    ? 'rounded-full bg-[#ef4444] text-white'
                    : isSameMonth(day, anchor)
                      ? 'text-white'
                      : 'text-[#6b6b70]',
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* All-day row */}
        <div className="flex border-b border-[#2e2e32]">
          <div className="w-14 shrink-0 border-r border-[#2e2e32] px-1 py-2 text-[10px] text-[#6b6b70]">
            All day
          </div>
          {days.map((day) => {
            const dayIso = day.toISOString()
            const dayTasks = allDayByDay.get(dayIso) || []
            return (
              <div
                key={`allday-${dayIso}`}
                className="min-h-[48px] min-w-0 flex-1 space-y-1 border-r border-[#2e2e32] p-1 last:border-r-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropToColumn(e, day)}
              >
                {dayTasks.map((t) => (
                  <div
                    key={t._id}
                    draggable
                    onDragStart={(e) => onDragStartTask(e, t._id)}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setTimeout(() => {
                        didDragRef.current = false
                      }, 0)
                    }}
                    onClick={() => openTask(t)}
                    className="group flex cursor-grab items-center gap-1 truncate rounded-md bg-[#7B68EE]/30 px-1.5 py-1 text-[11px] font-medium text-[#ddd6fe] active:cursor-grabbing"
                  >
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    <button
                      type="button"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!window.confirm(`Delete “${t.title}”?`)) return
                        deleteTask.mutate(t._id)
                      }}
                      className="shrink-0 rounded p-0.5 opacity-0 hover:bg-black/20 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        {/* Timed grid: CSS hour lines (no 126 cell divs) */}
        <div className="flex" style={{ minHeight: GRID_H }}>
          <div className="w-14 shrink-0 border-r border-[#2e2e32]">
            {HOUR_LABELS.map((label, i) => (
              <div
                key={HOURS[i]}
                className="border-b border-[#2e2e32] pr-2 pt-0.5 text-right text-[10px] text-[#6b6b70]"
                style={{ height: SLOT_H }}
              >
                {label}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayIso = day.toISOString()
            const dayTasks = timedByDay.get(dayIso) || []
            const dayEvents = eventsByDayMap.get(dayIso) || []

            return (
              <div
                key={dayIso}
                ref={(el) => {
                  if (el) dayColRefs.current[dayIso] = el
                  else delete dayColRefs.current[dayIso]
                }}
                className={cn(
                  'planner-day-col relative min-w-0 flex-1 border-r border-[#2e2e32] last:border-r-0',
                  !draggingId && 'cursor-crosshair',
                )}
                style={{
                  height: GRID_H,
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, transparent, transparent 55px, #2e2e32 55px, #2e2e32 56px)',
                }}
                onMouseDown={(e) => beginRangeSelect(e, day)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('planner-drag-over')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('planner-drag-over')
                }}
                onDrop={(e) => onDropToColumn(e, day)}
              >
                <div
                  ref={(el) => {
                    if (el) overlayRefs.current[dayIso] = el
                    else delete overlayRefs.current[dayIso]
                  }}
                  className="pointer-events-none absolute inset-x-1 z-[6] hidden rounded-md border border-[#7B68EE] bg-[#7B68EE]/35 px-1.5 py-1 text-[11px] font-medium text-white"
                />

                {dayTasks.map((t) => {
                  const start = taskStart(t)
                  const end = taskEnd(t)
                  const startH = start.getHours() + start.getMinutes() / 60
                  const endH = end.getHours() + end.getMinutes() / 60
                  if (startH < HOURS[0] || startH > HOURS[HOURS.length - 1] + 1) {
                    return null
                  }
                  const top = (startH - HOURS[0]) * SLOT_H
                  const height = Math.max((endH - startH) * SLOT_H, 28)

                  return (
                    <div
                      key={t._id}
                      data-cal-block
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation()
                        onDragStartTask(e, t._id)
                      }}
                      onDragEnd={() => {
                        setDraggingId(null)
                        setTimeout(() => {
                          didDragRef.current = false
                        }, 0)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        openTask(t)
                      }}
                      className="group absolute inset-x-1 z-[5] cursor-grab overflow-hidden rounded-md border border-[#5b4fd6] bg-[#7B68EE] px-1.5 py-1 text-[11px] font-medium text-white shadow-lg active:cursor-grabbing"
                      style={{ top, height }}
                      title={`${t.title} · click to manage · drag to reschedule`}
                    >
                      <div className="flex items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{t.title}</p>
                          <p className="truncate text-[10px] opacity-80">
                            {format(start, 'h:mm a')}
                          </p>
                        </div>
                        <button
                          type="button"
                          title="Delete"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!window.confirm(`Delete “${t.title}”?`)) return
                            deleteTask.mutate(t._id)
                          }}
                          className="shrink-0 rounded p-0.5 opacity-0 hover:bg-black/25 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {dayEvents.map((ev) => {
                  const start = new Date(ev.start)
                  const end = new Date(ev.end || addMinutes(start, 60))
                  const startH = start.getHours() + start.getMinutes() / 60
                  if (startH < HOURS[0]) return null
                  const top = (startH - HOURS[0]) * SLOT_H
                  const endH = end.getHours() + end.getMinutes() / 60
                  const height = Math.max((endH - startH) * SLOT_H, 24)
                  return (
                    <a
                      key={ev.id}
                      data-cal-block
                      href={ev.htmlLink || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-x-1 z-[4] overflow-hidden rounded-md border border-[#2563eb]/50 bg-[#3b82f6]/80 px-1.5 py-1 text-[11px] font-medium text-white"
                      style={{ top, height }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.title}
                    </a>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {composer && (
          <CreateModal
            composer={composer}
            setComposer={setComposer}
            creating={createScheduled.isPending}
            linkableTasks={allMyTasks}
            onSave={(payload) => {
              if (!payload.title.trim()) {
                toast('Add a title', { type: 'error' })
                return
              }
              const {
                tab,
                title,
                start,
                end,
                description,
                location,
                videoLink,
                participantIds,
                linkedTaskIds,
              } = payload
              createScheduled.mutate({
                title: title.trim(),
                description: description || '',
                location: location || '',
                videoLink: videoLink || '',
                isPersonal: true,
                status: 'todo',
                priority: tab === 'event' ? 'medium' : 'high',
                startDate: start.toISOString(),
                dueDate: end.toISOString(),
                participants: participantIds || [],
                assignee: participantIds?.[0] || undefined,
                dependsOn: linkedTaskIds || [],
              })
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <TaskPeekModal
            task={selected}
            start={taskStart(selected)}
            end={taskEnd(selected)}
            deleting={deleteTask.isPending}
            onClose={() => setSelected(null)}
            onDelete={() => {
              if (!window.confirm(`Delete “${selected.title}”?`)) return
              deleteTask.mutate(selected._id)
            }}
            onOpenProject={() => {
              const projectId =
                typeof selected.projectId === 'object'
                  ? selected.projectId?._id
                  : selected.projectId
              if (!projectId || selected.isPersonal) return
              // Keep selection shape for TaskDetailPanel via projectOpen
              setProjectOpen({
                taskId: selected._id,
                projectId,
                projectName: selected.projectId?.name,
              })
              setSelected(null)
            }}
          />
        )}
      </AnimatePresence>

      <TaskDetailPanel
        open={!!projectOpen}
        mode="edit"
        taskId={projectOpen?.taskId}
        projectId={projectOpen?.projectId}
        projectName={projectOpen?.projectName}
        onClose={() => setProjectOpen(null)}
      />
    </div>
  )
}

function CreateModal({ composer, setComposer, onSave, creating, linkableTasks = [] }) {
  const [tab, setTab] = useState(composer.tab || 'task')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [videoLink, setVideoLink] = useState('')
  const [videoDraft, setVideoDraft] = useState('')
  const [start, setStart] = useState(composer.start)
  const [end, setEnd] = useState(composer.end)
  const [panel, setPanel] = useState(
    composer.participantIds?.length ? 'participants' : null,
  ) // participants | tasks | location | description
  const [peopleQuery, setPeopleQuery] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [participantIds, setParticipantIds] = useState(
    composer.participantIds || [],
  )
  const [linkedTaskIds, setLinkedTaskIds] = useState([])

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => api('/users'),
  })
  const users = usersData?.users || []

  const durationMin = Math.max(differenceInMinutes(end, start), 15)
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`
      : `${durationMin}m`

  const tabs = [
    { id: 'event', label: 'Event' },
    { id: 'task', label: 'Task' },
    { id: 'focus', label: 'Focus time' },
    { id: 'ooo', label: 'OOO' },
  ]

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(peopleQuery.trim().toLowerCase()),
  )
  const filteredTasks = linkableTasks.filter((t) =>
    t.title.toLowerCase().includes(taskQuery.trim().toLowerCase()),
  )

  const toggleId = (list, setList, id) => {
    setList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const savePayload = () =>
    onSave({
      tab,
      title,
      start,
      end,
      description,
      location,
      videoLink,
      participantIds,
      linkedTaskIds,
    })

  const saveLabel =
    tab === 'task'
      ? 'Save task'
      : tab === 'event'
        ? 'Save event'
        : tab === 'focus'
          ? 'Save focus time'
          : 'Save OOO'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      onClick={() => setComposer(null)}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#2e2e32] bg-[#1c1c1e] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-[#2e2e32] bg-[#1c1c1e] px-3 pt-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'relative px-3 pb-2.5 text-[13px] font-medium',
                tab === t.id ? 'text-white' : 'text-[#8b8b90] hover:text-white',
              )}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white" />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setComposer(null)}
            className="ml-auto mb-2 rounded-md p-1 text-[#8b8b90] hover:bg-[#252528] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add title, @ for people…"
            className="w-full bg-transparent text-[18px] font-medium text-white outline-none placeholder:text-[#6b6b70]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') savePayload()
            }}
          />

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#2e2e32] bg-[#121214] px-3 py-2 text-[13px] text-[#c5c5c8]">
            <Clock className="h-3.5 w-3.5 text-[#8b8b90]" />
            <span>{format(start, 'MMM d, yyyy h:mm a')}</span>
            <span className="text-[#6b6b70]">→</span>
            <span>{format(end, 'h:mm a')}</span>
            <span className="ml-auto rounded bg-[#252528] px-1.5 py-0.5 text-[11px] text-[#8b8b90]">
              {durationLabel}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="time"
              value={format(start, 'HH:mm')}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number)
                const next = setMinutes(setHours(start, h), m)
                setStart(next)
                if (next >= end) setEnd(addMinutes(next, 60))
              }}
              className="h-9 flex-1 rounded-md border border-[#2e2e32] bg-[#121214] px-2 text-[13px] text-white"
            />
            <input
              type="time"
              value={format(end, 'HH:mm')}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number)
                setEnd(setMinutes(setHours(end, h), m))
              }}
              className="h-9 flex-1 rounded-md border border-[#2e2e32] bg-[#121214] px-2 text-[13px] text-white"
            />
          </div>

          {videoLink ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-3 py-2">
              <Video className="h-4 w-4 shrink-0 text-[#3b82f6]" />
              <a
                href={videoLink}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-[12px] text-[#93c5fd] hover:underline"
              >
                {videoLink}
              </a>
              <button
                type="button"
                onClick={() => setVideoLink('')}
                className="text-[11px] text-[#8b8b90] hover:text-white"
              >
                Remove
              </button>
            </div>
          ) : panel === 'video' ? (
            <div className="space-y-2 rounded-lg border border-[#2e2e32] bg-[#121214] p-2">
              <input
                autoFocus
                value={videoDraft}
                onChange={(e) => setVideoDraft(e.target.value)}
                placeholder="Paste Meet / Zoom / Teams link…"
                className="h-9 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 text-[12px] text-white outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && videoDraft.trim()) {
                    setVideoLink(videoDraft.trim())
                    setPanel(null)
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!videoDraft.trim()) {
                      toast('Paste a video link first', { type: 'error' })
                      return
                    }
                    setVideoLink(videoDraft.trim())
                    setPanel(null)
                  }}
                  className="flex-1 rounded-md bg-[#3b82f6] py-1.5 text-[12px] font-medium text-white"
                >
                  Save link
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="rounded-md px-3 text-[12px] text-[#8b8b90] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPanel('video')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2e2e32] py-2.5 text-[13px] font-medium text-[#c5c5c8] hover:bg-[#252528]"
            >
              <Video className="h-4 w-4 text-[#3b82f6]" />
              Add video call
            </button>
          )}

          {/* Participants */}
          <div>
            <button
              type="button"
              onClick={() =>
                setPanel((p) => (p === 'participants' ? null : 'participants'))
              }
              className="flex w-full items-center gap-2 text-[13px] text-[#8b8b90] hover:text-white"
            >
              <Users className="h-3.5 w-3.5" />
              Add participants
              {participantIds.length > 0 && (
                <span className="rounded bg-[#252528] px-1.5 py-0.5 text-[11px] text-[#c5c5c8]">
                  {participantIds.length}
                </span>
              )}
            </button>
            {participantIds.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {participantIds.map((id) => {
                  const u = users.find((x) => x._id === id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        toggleId(participantIds, setParticipantIds, id)
                      }
                      className="rounded-full bg-[#7B68EE]/25 px-2 py-0.5 text-[11px] text-[#ddd6fe] hover:bg-[#ef4444]/30"
                      title="Remove"
                    >
                      {u?.name || 'User'} ×
                    </button>
                  )
                })}
              </div>
            )}
            {panel === 'participants' && (
              <div className="mt-2 rounded-lg border border-[#2e2e32] bg-[#121214] p-2">
                <input
                  autoFocus
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Search people…"
                  className="mb-2 h-8 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 text-[12px] text-white outline-none"
                />
                <div className="max-h-36 space-y-0.5 overflow-y-auto">
                  {filteredUsers.length === 0 && (
                    <p className="px-2 py-2 text-[12px] text-[#6b6b70]">
                      No people found
                    </p>
                  )}
                  {filteredUsers.map((u) => {
                    const on = participantIds.includes(u._id)
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() =>
                          toggleId(participantIds, setParticipantIds, u._id)
                        }
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]',
                          on
                            ? 'bg-[#7B68EE]/25 text-white'
                            : 'text-[#c5c5c8] hover:bg-[#252528]',
                        )}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2a2a2e] text-[10px] font-semibold">
                          {u.name?.charAt(0) || '?'}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{u.name}</span>
                        {on && <CheckSquare className="h-3.5 w-3.5 text-[#a78bfa]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Link tasks */}
          <div>
            <button
              type="button"
              onClick={() => setPanel((p) => (p === 'tasks' ? null : 'tasks'))}
              className="flex w-full items-center gap-2 text-[13px] text-[#8b8b90] hover:text-white"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Link Cubic tasks
              {linkedTaskIds.length > 0 && (
                <span className="rounded bg-[#252528] px-1.5 py-0.5 text-[11px] text-[#c5c5c8]">
                  {linkedTaskIds.length}
                </span>
              )}
            </button>
            {linkedTaskIds.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {linkedTaskIds.map((id) => {
                  const t = linkableTasks.find((x) => x._id === id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        toggleId(linkedTaskIds, setLinkedTaskIds, id)
                      }
                      className="flex w-full items-center gap-2 rounded-md bg-[#252528] px-2 py-1 text-left text-[11px] text-[#c5c5c8] hover:bg-[#ef4444]/20"
                    >
                      <CheckSquare className="h-3 w-3 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">
                        {t?.title || 'Task'}
                      </span>
                      <X className="h-3 w-3 shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
            {panel === 'tasks' && (
              <div className="mt-2 rounded-lg border border-[#2e2e32] bg-[#121214] p-2">
                <input
                  autoFocus
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  placeholder="Search tasks…"
                  className="mb-2 h-8 w-full rounded-md border border-[#2e2e32] bg-[#1c1c1e] px-2 text-[12px] text-white outline-none"
                />
                <div className="max-h-36 space-y-0.5 overflow-y-auto">
                  {filteredTasks.slice(0, 20).map((t) => {
                    const on = linkedTaskIds.includes(t._id)
                    return (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() =>
                          toggleId(linkedTaskIds, setLinkedTaskIds, t._id)
                        }
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]',
                          on
                            ? 'bg-[#7B68EE]/25 text-white'
                            : 'text-[#c5c5c8] hover:bg-[#252528]',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        {on && <CheckSquare className="h-3.5 w-3.5 text-[#a78bfa]" />}
                      </button>
                    )
                  })}
                  {filteredTasks.length === 0 && (
                    <p className="px-2 py-2 text-[12px] text-[#6b6b70]">
                      No tasks to link
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div>
            <button
              type="button"
              onClick={() =>
                setPanel((p) => (p === 'location' ? null : 'location'))
              }
              className="flex w-full items-center gap-2 text-[13px] text-[#8b8b90] hover:text-white"
            >
              <MapPin className="h-3.5 w-3.5" />
              {location || 'Add location or room'}
            </button>
            {panel === 'location' && (
              <input
                autoFocus
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Conference Room B / Zoom office"
                className="mt-2 h-9 w-full rounded-md border border-[#2e2e32] bg-[#121214] px-2 text-[12px] text-white outline-none"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <button
              type="button"
              onClick={() =>
                setPanel((p) => (p === 'description' ? null : 'description'))
              }
              className="flex w-full items-center gap-2 text-[13px] text-[#8b8b90] hover:text-white"
            >
              <AlignLeft className="h-3.5 w-3.5" />
              Add description
            </button>
            {(panel === 'description' || description) && (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Notes…"
                className="mt-2 w-full resize-none rounded-md border border-[#2e2e32] bg-[#121214] px-2 py-1.5 text-[12px] text-white outline-none"
              />
            )}
          </div>

          <button
            type="button"
            disabled={creating}
            onClick={savePayload}
            className="w-full rounded-lg bg-[#7B68EE] py-2.5 text-[13px] font-semibold text-white hover:bg-[#6a58d9] disabled:opacity-50"
          >
            {creating ? 'Saving…' : saveLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TaskPeekModal({
  task,
  start,
  end,
  onClose,
  onDelete,
  onOpenProject,
  deleting,
}) {
  const canOpenProject = !task.isPersonal && !!task.projectId

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-xl border border-[#2e2e32] bg-[#1c1c1e] shadow-2xl"
      >
        <div className="flex items-start gap-2 border-b border-[#2e2e32] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-white">{task.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#8b8b90]">
              <Clock className="h-3.5 w-3.5" />
              {format(start, 'MMM d · h:mm a')}
              <span className="text-[#6b6b70]">→</span>
              {format(end, 'h:mm a')}
            </p>
            {task.location && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-[#8b8b90]">
                <MapPin className="h-3 w-3" />
                {task.location}
              </p>
            )}
            {task.videoLink && (
              <a
                href={task.videoLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1 text-[11px] text-[#93c5fd] hover:underline"
              >
                <Video className="h-3 w-3" />
                Join video call
              </a>
            )}
            {task.projectId?.name && (
              <p className="mt-1 text-[11px] text-[#6b6b70]">
                {task.projectId.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#8b8b90] hover:bg-[#252528] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4">
          {canOpenProject && (
            <button
              type="button"
              onClick={onOpenProject}
              className="w-full rounded-lg border border-[#2e2e32] py-2.5 text-[13px] font-medium text-[#c5c5c8] hover:bg-[#252528]"
            >
              Open task details
            </button>
          )}
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ef4444]/15 py-2.5 text-[13px] font-semibold text-[#f87171] hover:bg-[#ef4444]/25 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
