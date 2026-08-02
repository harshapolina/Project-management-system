import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react'
import { api, assetUrl } from '../lib/api'
import { formatInr } from '../lib/format'
import { toast } from '../components/ui'
import { cn } from '../lib/utils'

const UNITS = [
  { value: 'sft', label: 'Sq.ft' },
  { value: 'rft', label: 'Rft' },
  { value: 'nos', label: "No's" },
  { value: 'ls', label: 'LS' },
  { value: 'sqm', label: 'Sq.mtr' },
  { value: 'rmt', label: 'Rmtr' },
]
const UNIT_VALUES = UNITS.map((u) => u.value)

function unitLabel(unit) {
  return UNITS.find((u) => u.value === unit)?.label || unit
}

/** Match Excel unit cells like "sq.ft", "SQFT", "no's", "rmt" to a known unit. */
function matchUnit(raw) {
  const key = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  if (!key) return null
  return (
    UNITS.find(
      (u) =>
        u.value === key || u.label.toLowerCase().replace(/[^a-z]/g, '') === key,
    )?.value || null
  )
}
const ROOM_SUGGESTIONS = [
  'General',
  'Living',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Dining',
  'Lobby',
  'Balcony',
  'Office',
  'Corridor',
]

const STATUS_META = {
  draft: {
    label: 'Draft',
    dot: 'bg-slate-400',
    pill: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
  sent: {
    label: 'Sent',
    dot: 'bg-blue-500',
    pill: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
  viewed: {
    label: 'Viewed',
    dot: 'bg-indigo-500',
    pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  approved: {
    label: 'Approved',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    dot: 'bg-red-500',
    pill: 'bg-red-50 text-red-700 ring-red-200',
  },
}

const CARD =
  'rounded-2xl border border-[#e6ecf4] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.05)]'

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function blankLine(room = 'General') {
  return {
    _key: uid(),
    description: '',
    unit: 'nos',
    qty: 1,
    rate: 0,
    amount: 0,
    room,
    image: '',
  }
}

function normalizeItems(items = []) {
  return items.map((it, i) => ({
    _key: it._id || it._key || `row-${i}`,
    description: it.description || '',
    unit: it.unit || 'nos',
    qty: Number(it.qty) || 0,
    rate: Number(it.rate) || 0,
    amount: Number(it.amount) || (Number(it.qty) || 0) * (Number(it.rate) || 0),
    room: it.room || 'General',
    image: it.image || '',
  }))
}

function lineAmount(it) {
  return (Number(it.qty) || 0) * (Number(it.rate) || 0)
}

function projectIdOf(quote) {
  const p = quote?.projectId
  if (!p) return ''
  return String(p._id || p)
}

function initialsOf(name = '') {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '—'
  )
}

/* ─────────────── Excel parsing ─────────────── */

const HEADER_ALIASES = {
  room: ['room', 'area', 'space', 'location', 'zone', 'category', 'section'],
  description: [
    'description',
    'item',
    'items',
    'particulars',
    'particular',
    'work',
    'scope',
    'details',
    'detail',
    'name',
    'specification',
  ],
  unit: ['unit', 'units', 'uom'],
  qty: ['qty', 'quantity', 'quantities', 'nos', 'no', 'count'],
  rate: ['rate', 'price', 'unitrate', 'unitprice', 'cost'],
  amount: ['amount', 'total', 'value', 'totalamount', 'lineamount'],
}

function normalizeHeader(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function matchHeader(value) {
  const key = normalizeHeader(value)
  if (!key) return null
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return field
  }
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => key.includes(alias))) return field
  }
  return null
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/**
 * Turn a raw `sheet_to_json(..., { header: 1 })` grid into BOQ lines.
 * Detects the header row, otherwise falls back to column order.
 */
function rowsToBoqLines(grid) {
  let headerRow = -1
  let columnMap = {}

  for (let r = 0; r < Math.min(grid.length, 25); r += 1) {
    const map = {}
    ;(grid[r] || []).forEach((cell, c) => {
      const field = matchHeader(cell)
      if (field && map[field] === undefined) map[field] = c
    })
    if (
      Object.keys(map).length >= 2 &&
      (map.description !== undefined || map.qty !== undefined)
    ) {
      headerRow = r
      columnMap = map
      break
    }
  }

  if (headerRow === -1) {
    columnMap = { room: 0, description: 1, unit: 2, qty: 3, rate: 4 }
  }

  const lines = []
  let lastRoom = 'General'

  for (let r = headerRow + 1; r < grid.length; r += 1) {
    const row = grid[r] || []
    if (!row.some((cell) => String(cell ?? '').trim())) continue

    const description = String(row[columnMap.description] ?? '').trim()
    const qty = toNumber(row[columnMap.qty])
    const rate = toNumber(row[columnMap.rate])
    const amount =
      columnMap.amount !== undefined ? toNumber(row[columnMap.amount]) : 0
    const roomCell = String(row[columnMap.room] ?? '').trim()

    // A row with only a label and no numbers is a room / section heading
    if (description && !qty && !rate && !amount && !roomCell) {
      lastRoom = description
      continue
    }
    if (!description && !qty && !rate && !amount) {
      if (roomCell) lastRoom = roomCell
      continue
    }
    if (roomCell) lastRoom = roomCell

    lines.push({
      _key: uid(),
      room: lastRoom || 'General',
      description: description || 'Imported line',
      unit: matchUnit(row[columnMap.unit]) || 'nos',
      qty: qty || (amount && rate ? amount / rate : 0),
      rate: rate || (amount && qty ? amount / qty : 0),
      amount: amount || qty * rate,
      image: '',
    })
  }

  return lines
}

/* ─────────────── Page shell ─────────────── */

export function BoqPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-boq'],
    queryFn: () => api('/projects'),
  })
  const { data: quotesData, isLoading: quotesLoading } = useQuery({
    queryKey: ['quotations', 'all'],
    queryFn: () => api('/quotations'),
  })

  const projects = projectsData?.projects || []
  const quotations = quotesData?.quotations || []

  const statsByProject = useMemo(() => {
    const map = {}
    for (const q of quotations) {
      const pid = projectIdOf(q)
      if (!pid) continue
      if (!map[pid]) map[pid] = { count: 0, total: 0, approved: 0, drafts: 0 }
      map[pid].count += 1
      map[pid].total += Number(q.grandTotal) || 0
      if (q.status === 'approved') map[pid].approved += 1
      if (q.status === 'draft') map[pid].drafts += 1
    }
    return map
  }, [quotations])

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return projects
    return projects.filter((p) =>
      [p.name, p.clientName, p.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    )
  }, [projects, search])

  const activeProject = projects.find((p) => String(p._id) === String(projectId))
  const projectQuotes = useMemo(
    () => quotations.filter((q) => projectIdOf(q) === String(projectId || '')),
    [quotations, projectId],
  )

  const portfolioTotal = quotations.reduce(
    (s, q) => s + (Number(q.grandTotal) || 0),
    0,
  )
  const approvedTotal = quotations
    .filter((q) => q.status === 'approved')
    .reduce((s, q) => s + (Number(q.grandTotal) || 0), 0)

  return (
    <div className="h-full min-h-0 bg-[#f4f7fb] print:block print:h-auto print:bg-white">
      <div className="h-full min-h-0 print:h-auto print:overflow-visible">
        {!projectId ? (
          <PortfolioView
            projects={filteredProjects}
            stats={statsByProject}
            loading={projectsLoading || quotesLoading}
            search={search}
            onSearch={setSearch}
            onPick={(id) => navigate(`/boq/${id}`)}
            sheetCount={quotations.length}
            portfolioTotal={portfolioTotal}
            approvedTotal={approvedTotal}
          />
        ) : (
          <ProjectBoqBoard
            key={projectId}
            project={activeProject}
            projectId={projectId}
            quotes={projectQuotes}
            loading={quotesLoading}
            onBack={() => navigate('/boq')}
          />
        )}
      </div>
    </div>
  )
}

/* ─────────────── All-projects overview ─────────────── */

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'with', label: 'With sheets' },
  { key: 'approved', label: 'Approved' },
  { key: 'empty', label: 'Not started' },
]

function PortfolioView({
  projects,
  stats,
  loading,
  search,
  onSearch,
  onPick,
  sheetCount,
  portfolioTotal,
  approvedTotal,
}) {
  const [filter, setFilter] = useState('all')

  const visible = projects.filter((p) => {
    const s = stats[String(p._id)] || { count: 0, approved: 0 }
    if (filter === 'with') return s.count > 0
    if (filter === 'approved') return s.approved > 0
    if (filter === 'empty') return s.count === 0
    return true
  })

  const maxTotal = Math.max(
    1,
    ...projects.map((p) => stats[String(p._id)]?.total || 0),
  )
  const approvedShare = portfolioTotal
    ? Math.round((approvedTotal / portfolioTotal) * 100)
    : 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1220px] px-5 py-6 sm:px-8 sm:py-8">
        {/* Hero */}
        <section
          className="relative overflow-hidden rounded-3xl border border-[#e2eaf5] bg-white px-6 py-7 shadow-[0_2px_4px_rgba(16,24,40,0.03),0_12px_32px_-20px_rgba(16,24,40,0.22)] sm:px-8"
          style={{
            backgroundImage:
              'radial-gradient(880px 300px at 92% -20%, rgba(37,99,235,0.10), transparent 60%), radial-gradient(520px 240px at 2% 120%, rgba(16,185,129,0.09), transparent 58%)',
          }}
        >
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="min-w-0 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4ff] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1d4ed8] ring-1 ring-inset ring-[#d7e5fc]">
                <Sparkles className="h-3 w-3" />
                Estimation
              </span>
              <h1 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#0b1220] sm:text-[32px]">
                Bill of Quantities
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#64748b]">
                Every project&apos;s quote in one workspace. Import an Excel BOQ
                and we&apos;ll lay it out into rows, attach reference images to
                any line, then approve to set the project budget.
              </p>
            </div>

            <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
              <HeroStat label="Projects" value={projects.length} />
              <HeroStat label="Sheets" value={sheetCount} />
              <HeroStat label="Quoted" value={formatInr(portfolioTotal)} accent />
            </div>
          </div>

          {portfolioTotal > 0 && (
            <div className="mt-7 border-t border-[#eef2f7] pt-4">
              <div className="flex items-center justify-between text-[11.5px] font-medium text-[#8a98ac]">
                <span>
                  Approved value{' '}
                  <span className="font-semibold tabular-nums text-[#0b1220]">
                    {formatInr(approvedTotal)}
                  </span>
                </span>
                <span className="tabular-nums">{approvedShare}% of quoted</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${approvedShare}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-[#e4eaf3] bg-[#eef2f7] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition',
                  filter === f.key
                    ? 'bg-white text-[#0b1220] shadow-[0_1px_2px_rgba(16,24,40,0.10)]'
                    : 'text-[#64748b] hover:text-[#0b1220]',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#9aa7ba]" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search projects or clients"
              className="h-[38px] w-full rounded-xl border border-[#e4eaf3] bg-white pl-9 pr-8 text-[12.5px] text-[#0b1220] shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-[#9aa7ba] focus:border-[#b6cef7] focus:ring-4 focus:ring-[#2563eb]/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearch('')}
                title="Clear search"
                className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-[#9aa7ba] transition hover:bg-[#f1f5f9] hover:text-[#475569]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="mt-4 pb-10">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-[168px] animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className={cn(CARD, 'px-8 py-16 text-center')}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f7fb] text-[#b4c0d0]">
                <Layers className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-[#0b1220]">
                Nothing here yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#8a98ac]">
                No projects match this filter. Try “All”, or create a project
                first — its BOQ sheets will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <ProjectCard
                  key={p._id}
                  project={p}
                  stats={stats[String(p._id)]}
                  maxTotal={maxTotal}
                  onOpen={() => onPick(p._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HeroStat({ label, value, accent }) {
  return (
    <div
      className={cn(
        'rounded-2xl px-3.5 py-3 ring-1 ring-inset',
        accent
          ? 'bg-[#eef4ff] ring-[#d7e5fc]'
          : 'bg-[#f7f9fc] ring-[#e9eef6]',
      )}
    >
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9aa7ba]">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 whitespace-nowrap text-[17px] font-semibold tabular-nums tracking-[-0.02em]',
          accent ? 'text-[#1d4ed8]' : 'text-[#0b1220]',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function ProjectCard({ project, stats, maxTotal, onOpen }) {
  const s = stats || { count: 0, total: 0, approved: 0, drafts: 0 }
  const share = Math.round((s.total / maxTotal) * 100)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        CARD,
        'group relative overflow-hidden p-5 text-left transition-all duration-200',
        'hover:-translate-y-[3px] hover:border-[#c7dbfb] hover:shadow-[0_16px_36px_-18px_rgba(16,24,40,0.28)]',
      )}
    >
      <span className="absolute inset-x-0 top-0 h-[3px] scale-x-0 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f7fb] text-[12px] font-bold tracking-tight text-[#64748b] ring-1 ring-inset ring-[#e9eef6] transition group-hover:bg-[#eef4ff] group-hover:text-[#2563eb] group-hover:ring-[#d7e5fc]">
          {initialsOf(project.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold tracking-[-0.012em] text-[#0b1220]">
            {project.name}
          </h3>
          <p className="mt-0.5 truncate text-[12px] text-[#8a98ac]">
            {project.clientName || 'No client'}
            {project.location ? ` · ${project.location}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9aa7ba]">
          Quoted value
        </p>
        <p className="mt-0.5 text-[22px] font-semibold tabular-nums leading-none tracking-[-0.03em] text-[#0b1220]">
          {formatInr(s.total)}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#eef2f7]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#7daafb] transition-all duration-500"
            style={{ width: `${s.total ? Math.max(share, 4) : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone={s.count ? 'neutral' : 'muted'}>
            {s.count} {s.count === 1 ? 'sheet' : 'sheets'}
          </Chip>
          {s.approved > 0 && <Chip tone="success">{s.approved} approved</Chip>}
          {s.drafts > 0 && <Chip tone="muted">{s.drafts} draft</Chip>}
        </div>
        <span className="flex items-center gap-1 text-[12px] font-semibold text-[#2563eb] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-1">
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

function Chip({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-[#f1f5f9] text-[#475569] ring-[#e4eaf3]',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    muted: 'bg-white text-[#94a3b8] ring-[#e9eef6]',
  }
  return (
    <span
      className={cn(
        'rounded-lg px-2 py-[3px] text-[11px] font-semibold ring-1 ring-inset',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

/* ─────────────── One project: sheet tabs + editor ─────────────── */

function ProjectBoqBoard({ project, projectId, quotes, loading, onBack }) {
  const [activeId, setActiveId] = useState(null)
  const [draft, setDraft] = useState(false)

  useEffect(() => {
    if (draft) return
    if (!quotes.length) {
      setActiveId(null)
      return
    }
    if (!activeId || !quotes.some((q) => String(q._id) === String(activeId))) {
      setActiveId(String(quotes[0]._id))
    }
  }, [quotes, activeId, draft])

  const activeQuote = draft
    ? null
    : quotes.find((q) => String(q._id) === String(activeId))

  const projectTotal = quotes.reduce(
    (s, q) => s + (Number(q.grandTotal) || 0),
    0,
  )

  return (
    <div className="flex h-full min-h-0 flex-col print:block print:h-auto">
      <header className="shrink-0 border-b border-[#e1e8f1] bg-white px-4 pt-4 print:hidden sm:px-6">
        <button
          type="button"
          onClick={onBack}
          title="Back to all projects"
          className="group inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9aa7ba] transition hover:text-[#1d4ed8]"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
          BOQ &amp; Quotes
        </button>

        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[20px] font-semibold leading-tight tracking-[-0.022em] text-[#0b1220]">
              {project?.name || 'Project'}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-[#8a98ac]">
              {project?.clientName || 'No client'}
              {project?.location ? ` · ${project.location}` : ''} ·{' '}
              <span className="font-semibold text-[#475569] tabular-nums">
                {formatInr(projectTotal)}
              </span>{' '}
              across {quotes.length} {quotes.length === 1 ? 'sheet' : 'sheets'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDraft(true)
              setActiveId(null)
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#2563eb] px-3.5 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.75)] transition hover:bg-[#1d4ed8]"
          >
            <Plus className="h-4 w-4" />
            New sheet
          </button>
        </div>

        {(quotes.length > 0 || draft) && (
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-2.5">
            {quotes.map((q) => {
              const meta = STATUS_META[q.status] || STATUS_META.draft
              const active = !draft && String(q._id) === String(activeId)
              return (
                <button
                  key={q._id}
                  type="button"
                  onClick={() => {
                    setDraft(false)
                    setActiveId(String(q._id))
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-all duration-150',
                    active
                      ? 'border-[#c7dbfb] bg-[#eef4ff] shadow-[0_1px_2px_rgba(37,99,235,0.10)]'
                      : 'border-[#e9eef6] bg-white hover:border-[#d7e0ec] hover:bg-[#f9fbfd]',
                  )}
                >
                  <span
                    className={cn('h-1.5 w-1.5 shrink-0 rounded-full', meta.dot)}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block max-w-[180px] truncate text-[12.5px] font-semibold tracking-[-0.005em]',
                        active ? 'text-[#1d4ed8]' : 'text-[#0b1220]',
                      )}
                    >
                      {q.title}
                    </span>
                    <span className="mt-[1px] block text-[10.5px] tabular-nums text-[#8a98ac]">
                      {q.versionLabel || 'Standard'} ·{' '}
                      {formatInr(q.grandTotal || 0)}
                    </span>
                  </span>
                </button>
              )
            })}
            {draft && (
              <span className="flex shrink-0 items-center gap-2 rounded-xl border border-dashed border-[#b6cef7] bg-[#f5f9ff] px-3 py-2 text-[12px] font-semibold text-[#1d4ed8]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2563eb]" />
                New sheet · unsaved
              </span>
            )}
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 print:h-auto print:overflow-visible">
        {loading ? (
          <div className="m-5 h-64 animate-pulse rounded-2xl bg-white" />
        ) : !activeQuote && !draft ? (
          <EmptyProject onCreate={() => setDraft(true)} />
        ) : (
          <BoqSheet
            key={activeQuote?._id || 'draft'}
            quotation={activeQuote}
            project={project}
            projectId={projectId}
            onCreated={(id) => {
              setDraft(false)
              setActiveId(String(id))
            }}
            onDeleted={() => {
              setDraft(false)
              setActiveId(null)
            }}
            onCancelDraft={draft ? () => setDraft(false) : null}
          />
        )}
      </div>
    </div>
  )
}

function EmptyProject({ onCreate }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className={cn(CARD, 'max-w-lg px-10 py-12 text-center')}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eef4ff] to-[#f7faff] text-[#2563eb] ring-1 ring-inset ring-[#dbe7fb]">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <p className="mt-4 text-[17px] font-semibold tracking-[-0.02em] text-[#0b1220]">
          No BOQ for this project yet
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-[#8a98ac]">
          Start a blank sheet and type your lines, or drop in an existing Excel
          BOQ — we&apos;ll detect the columns and arrange everything into rows.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-5 text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)] transition hover:bg-[#1d4ed8]"
        >
          <Plus className="h-4 w-4" />
          Create BOQ
        </button>
      </div>
    </div>
  )
}

/* ─────────────── The editable sheet ─────────────── */

function BoqSheet({
  quotation,
  project,
  projectId,
  onCreated,
  onDeleted,
  onCancelDraft,
}) {
  const qc = useQueryClient()
  const tableRef = useRef(null)
  const excelInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const rowImageInputRef = useRef(null)
  const rowImageTarget = useRef(null)

  const [title, setTitle] = useState(
    quotation?.title || `${project?.name || 'Project'} — BOQ`,
  )
  const [versionLabel, setVersionLabel] = useState(
    quotation?.versionLabel || 'Standard',
  )
  const [items, setItems] = useState(() =>
    quotation?.items?.length
      ? normalizeItems(quotation.items)
      : [blankLine(), blankLine(), blankLine()],
  )
  const [attachments, setAttachments] = useState(
    () => quotation?.attachments?.map((a) => ({ ...a })) || [],
  )
  const [discount, setDiscount] = useState(quotation?.discount || 0)
  const [gst, setGst] = useState(quotation?.gstPercent ?? 18)
  const [dirty, setDirty] = useState(false)
  const [focusIdx, setFocusIdx] = useState(null)
  const [importing, setImporting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)

  const locked = quotation?.status === 'approved'
  const status = quotation?.status || 'draft'
  const statusMeta = STATUS_META[status] || STATUS_META.draft

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + lineAmount(i), 0),
    [items],
  )
  const gstAmount = (subtotal * (Number(gst) || 0)) / 100
  const grand = Math.max(0, subtotal + gstAmount - (Number(discount) || 0))

  /** Contiguous runs of the same room, so the sheet reads like a real BOQ. */
  const groups = useMemo(() => {
    const out = []
    items.forEach((it, idx) => {
      const room = it.room?.trim() || 'General'
      const last = out[out.length - 1]
      if (last && last.room === room) {
        last.endIdx = idx
        last.total += lineAmount(it)
      } else {
        out.push({ room, startIdx: idx, endIdx: idx, total: lineAmount(it) })
      }
    })
    return out
  }, [items])

  const byRoom = useMemo(() => {
    const map = {}
    for (const it of items) {
      const room = it.room?.trim() || 'General'
      map[room] = (map[room] || 0) + lineAmount(it)
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items])

  const markDirty = () => {
    if (!locked) setDirty(true)
  }

  const updateItem = (idx, key, value) => {
    if (locked) return
    markDirty()
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it
        const next = { ...it, [key]: value }
        next.amount = lineAmount(next)
        return next
      }),
    )
  }

  const addLine = (afterIdx, room) => {
    if (locked) return
    markDirty()
    setItems((prev) => {
      const next = [...prev]
      const insertAt = afterIdx == null ? next.length : afterIdx + 1
      const r = room || next[afterIdx]?.room || 'General'
      next.splice(insertAt, 0, blankLine(r))
      return next
    })
    setFocusIdx(afterIdx == null ? items.length : afterIdx + 1)
  }

  const removeLine = (idx) => {
    if (locked) return
    markDirty()
    setItems((prev) =>
      prev.length <= 1 ? [blankLine()] : prev.filter((_, i) => i !== idx),
    )
  }

  const duplicateLine = (idx) => {
    if (locked) return
    markDirty()
    setItems((prev) => {
      const next = [...prev]
      next.splice(idx + 1, 0, { ...prev[idx], _key: uid() })
      return next
    })
  }

  const payload = (extra = {}) => ({
    title: title.trim() || 'Project BOQ',
    versionLabel: versionLabel.trim() || 'Standard',
    items: items.map(({ _key, ...i }) => ({
      ...i,
      qty: Number(i.qty) || 0,
      rate: Number(i.rate) || 0,
      amount: lineAmount(i),
      room: i.room?.trim() || 'General',
      description: i.description?.trim() || '',
      unit: i.unit || 'nos',
      image: i.image || '',
    })),
    attachments: attachments.map(({ _id, ...a }) => a),
    gstPercent: Number(gst) || 0,
    discount: Number(discount) || 0,
    subtotal,
    grandTotal: grand,
    ...extra,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['projects-boq'] })
    qc.invalidateQueries({ queryKey: ['project', projectId] })
    qc.invalidateQueries({ queryKey: ['portfolio'] })
    return qc.invalidateQueries({ queryKey: ['quotations'] })
  }

  const save = useMutation({
    mutationFn: (body) => {
      if (quotation?._id) {
        return api(`/quotations/${quotation._id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      return api('/quotations', {
        method: 'POST',
        body: JSON.stringify({ ...body, projectId }),
      })
    },
    onSuccess: async (res, vars) => {
      // Wait for the list to refetch so a brand new sheet exists before selecting it
      await invalidate()
      setDirty(false)
      if (!quotation?._id && res?.quotation?._id) onCreated?.(res.quotation._id)
      const next = vars?.status
      if (next === 'sent')
        toast('Marked as sent to the client', { type: 'success' })
      else if (next === 'approved')
        toast('Approved — project budget updated', { type: 'success' })
      else if (next === 'draft')
        toast('Sheet reopened as draft', { type: 'success' })
      else toast('BOQ saved', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const remove = useMutation({
    mutationFn: () => api(`/quotations/${quotation._id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      onDeleted?.()
      await invalidate()
      toast('BOQ deleted', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!locked && !save.isPending) save.mutate(payload())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hotkey saves the latest snapshot
  }, [locked, save.isPending, title, versionLabel, items, attachments, gst, discount])

  useEffect(() => {
    if (focusIdx == null) return
    const row = tableRef.current?.querySelector(`[data-row="${focusIdx}"]`)
    row?.querySelector('input[data-field="description"]')?.focus()
    setFocusIdx(null)
  }, [focusIdx, items.length])

  /* ── Excel import ── */
  const importExcel = async (file) => {
    if (!file) return
    setImporting(true)
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) throw new Error('That file has no readable sheet')
      const grid = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        blankrows: false,
        defval: '',
      })
      const lines = rowsToBoqLines(grid)
      if (!lines.length) {
        toast('No BOQ rows found in that sheet', { type: 'error' })
        return
      }
      markDirty()
      setItems((prev) => {
        const keep = prev.filter(
          (it) => it.description?.trim() || lineAmount(it) > 0,
        )
        return [...keep, ...lines]
      })
      toast(`Imported ${lines.length} lines from ${file.name}`, {
        type: 'success',
      })
    } catch (e) {
      toast(e.message || 'Could not read that Excel file', { type: 'error' })
    } finally {
      setImporting(false)
    }
  }

  /* ── Image upload ── */
  const uploadImage = (file) => {
    const form = new FormData()
    form.append('file', file)
    return api('/quotations/upload-image', { method: 'POST', body: form })
  }

  const addGalleryImages = async (files) => {
    const images = Array.from(files || []).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (!images.length) {
      toast('Only image files can be attached here', { type: 'error' })
      return
    }
    setUploading(true)
    try {
      const uploaded = []
      for (const file of images) {
        // eslint-disable-next-line no-await-in-loop -- keep upload order stable
        const res = await uploadImage(file)
        uploaded.push({ name: res.name, url: res.url, mime: res.mime })
      }
      markDirty()
      setAttachments((prev) => [...prev, ...uploaded])
      toast(`${uploaded.length} image(s) attached — save to keep them`, {
        type: 'success',
      })
    } catch (e) {
      toast(e.message || 'Upload failed', { type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const setRowImage = async (idx, file) => {
    if (!file?.type?.startsWith('image/')) {
      toast('Pick an image file', { type: 'error' })
      return
    }
    setUploading(true)
    try {
      const res = await uploadImage(file)
      updateItem(idx, 'image', res.url)
    } catch (e) {
      toast(e.message || 'Upload failed', { type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const onDropFiles = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (locked) return
    const files = Array.from(e.dataTransfer?.files || [])
    if (!files.length) return
    const excel = files.find((f) => /\.(xlsx|xls|csv)$/i.test(f.name))
    if (excel) {
      importExcel(excel)
      return
    }
    addGalleryImages(files)
  }

  const cell =
    'w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[12.5px] outline-none transition hover:bg-[#f4f7fb] focus:border-[#b6cef7] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/10 disabled:cursor-not-allowed disabled:opacity-60'

  const filledLines = items.filter(
    (it) => it.description?.trim() || lineAmount(it) > 0,
  ).length

  return (
    <>
      <div
        className="relative flex h-full min-h-0 flex-col gap-3.5 overflow-y-auto bg-[#f4f7fb] p-3.5 print:hidden lg:flex-row lg:overflow-visible"
        onDragOver={(e) => {
          e.preventDefault()
          if (!locked) setDragOver(true)
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return
          setDragOver(false)
        }}
        onDrop={onDropFiles}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#2563eb] bg-[#eef4ff]/85 backdrop-blur-[2px]">
            <div className="text-center">
              <Upload className="mx-auto h-7 w-7 text-[#2563eb]" />
              <p className="mt-2 text-[14px] font-semibold text-[#1d4ed8]">
                Drop to add
              </p>
              <p className="text-[12px] text-[#3b6fd4]">
                .xlsx / .csv imports rows · images attach as references
              </p>
            </div>
          </div>
        )}

        {/* Sheet */}
        <div className="flex min-h-[480px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e2eaf5] bg-white shadow-[0_2px_4px_rgba(16,24,40,0.03),0_16px_40px_-24px_rgba(16,24,40,0.25)] lg:min-h-0">
          {/* Action bar */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#edf1f7] px-4 py-3 sm:px-5">
            <div className="flex flex-1 items-center gap-2">
              <input
                value={title}
                disabled={locked}
                onChange={(e) => {
                  markDirty()
                  setTitle(e.target.value)
                }}
                className="h-[34px] min-w-[140px] flex-1 rounded-lg border border-transparent bg-transparent px-2 text-[16px] font-semibold tracking-[-0.02em] text-[#0b1220] outline-none transition hover:bg-[#f4f7fb] focus:border-[#b6cef7] focus:bg-white placeholder:text-[#b4c0d0] disabled:opacity-70"
                placeholder="Sheet title"
              />
              <span
                className={cn(
                  'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-[10.5px] font-bold uppercase tracking-[0.06em] ring-1 ring-inset',
                  statusMeta.pill,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} />
                {statusMeta.label}
              </span>
              {dirty && !locked && (
                <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-amber-50 px-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-amber-700 ring-1 ring-inset ring-amber-200">
                  Unsaved
                </span>
              )}
              {locked && (
                <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-emerald-50 px-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Locked
                </span>
              )}
            </div>

            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <input
                value={versionLabel}
                disabled={locked}
                onChange={(e) => {
                  markDirty()
                  setVersionLabel(e.target.value)
                }}
                className="h-[34px] w-28 rounded-xl border border-[#e4eaf3] bg-[#f7f9fc] px-2.5 text-[12px] font-medium text-[#475569] outline-none transition focus:border-[#b6cef7] focus:bg-white disabled:opacity-70"
                placeholder="Version"
              />
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                hidden
                onChange={(e) => {
                  importExcel(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={locked || importing}
                onClick={() => excelInputRef.current?.click()}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-xl border border-[#d7e5fc] bg-[#eef4ff] px-3 text-[12px] font-semibold text-[#1d4ed8] transition hover:border-[#b6cef7] hover:bg-[#e0ebff] disabled:opacity-40"
              >
                <Upload className="h-3.5 w-3.5" />
                {importing ? 'Reading…' : 'Import Excel'}
              </button>
              <div className="flex h-[34px] items-center rounded-xl border border-[#e4eaf3] bg-white px-0.5">
                <ToolButton
                  label="Add line"
                  disabled={locked}
                  onClick={() => addLine()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </ToolButton>
                <ToolButton label="Print / PDF" onClick={() => window.print()}>
                  <Printer className="h-3.5 w-3.5" />
                </ToolButton>
              </div>
              {onCancelDraft && (
                <button
                  type="button"
                  onClick={onCancelDraft}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-xl border border-[#e4eaf3] bg-white px-3 text-[12px] font-semibold text-[#64748b] transition hover:bg-[#f4f7fb] hover:text-[#0b1220]"
                >
                  <X className="h-3.5 w-3.5" />
                  Discard
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="min-h-0 flex-1 overflow-auto" ref={tableRef}>
            <input
              ref={rowImageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && rowImageTarget.current != null) {
                  setRowImage(rowImageTarget.current, file)
                }
                rowImageTarget.current = null
                e.target.value = ''
              }}
            />
            <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr className="[&>th]:h-9 [&>th]:border-b [&>th]:border-[#e4eaf3] [&>th]:bg-white/85 [&>th]:px-2 [&>th]:backdrop-blur-md [&>th]:text-[10px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-[#8a98ac]">
                  <th className="w-12 text-left">S.no</th>
                  <th className="w-[76px] text-left">Location</th>
                  <th className="text-left">Description</th>
                  <th className="w-[84px] text-left">Unit</th>
                  <th className="w-[88px] text-right">Qty</th>
                  <th className="w-[112px] text-right">Rate</th>
                  <th className="w-[124px] text-right">Amount</th>
                  <th className="w-[68px]" />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={`${g.room}-${g.startIdx}`}>
                    <tr>
                      <td
                        colSpan={8}
                        className="sticky top-[35px] z-[5] border-b border-[#edf1f7] bg-[#f7f9fc] px-3 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-[3px] rounded-full bg-[#2563eb]" />
                          <input
                            list="boq-rooms"
                            disabled={locked}
                            value={items[g.startIdx]?.room || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              if (locked) return
                              markDirty()
                              setItems((prev) =>
                                prev.map((it, i) =>
                                  i >= g.startIdx && i <= g.endIdx
                                    ? { ...it, room: value }
                                    : it,
                                ),
                              )
                            }}
                            className="w-40 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#1e3a8a] outline-none transition hover:bg-white focus:border-[#b6cef7] focus:bg-white disabled:opacity-70"
                          />
                          <span className="rounded-full bg-white px-2 py-[2px] text-[10px] font-semibold tabular-nums text-[#8a98ac] ring-1 ring-inset ring-[#e4eaf3]">
                            {g.endIdx - g.startIdx + 1}{' '}
                            {g.endIdx - g.startIdx === 0 ? 'line' : 'lines'}
                          </span>
                          <span className="ml-auto text-[12px] font-bold tabular-nums text-[#334155]">
                            {formatInr(g.total)}
                          </span>
                          {!locked && (
                            <button
                              type="button"
                              title={`Add a line to ${g.room}`}
                              onClick={() => addLine(g.endIdx, g.room)}
                              className="rounded-md p-1 text-[#9aa7ba] transition hover:bg-white hover:text-[#2563eb]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {items.slice(g.startIdx, g.endIdx + 1).map((it, i) => {
                      const idx = g.startIdx + i
                      return (
                        <tr
                          key={it._key}
                          data-row={idx}
                          className="group/row transition-colors [&>td]:border-b [&>td]:border-[#f1f5f9] hover:[&>td]:bg-[#fbfcfe]"
                        >
                          <td className="px-2 py-1.5 text-[11px] tabular-nums text-[#b4c0d0]">
                            {idx + 1}
                          </td>
                          <td className="px-1.5 py-1.5">
                            {it.image ? (
                              <div className="relative h-9 w-9">
                                <img
                                  src={assetUrl(it.image)}
                                  alt=""
                                  onClick={() => setPreview(assetUrl(it.image))}
                                  className="h-9 w-9 cursor-zoom-in rounded-lg object-cover ring-1 ring-[#e4eaf3] transition hover:ring-[#b6cef7]"
                                />
                                {!locked && (
                                  <button
                                    type="button"
                                    title="Remove image"
                                    onClick={() => updateItem(idx, 'image', '')}
                                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-[#0f172a] text-white shadow-sm group-hover/row:flex"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                title="Attach a reference image to this line"
                                disabled={locked || uploading}
                                onClick={() => {
                                  rowImageTarget.current = idx
                                  rowImageInputRef.current?.click()
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-[#dde5ef] text-[#c3ccd9] transition hover:border-[#b6cef7] hover:bg-[#f5f9ff] hover:text-[#2563eb] disabled:opacity-40"
                              >
                                <ImageIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                          <td className="px-1.5 py-1.5">
                            <input
                              data-field="description"
                              disabled={locked}
                              value={it.description || ''}
                              placeholder="Work / item description"
                              onChange={(e) =>
                                updateItem(idx, 'description', e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  addLine(idx)
                                }
                              }}
                              className={cn(
                                cell,
                                'font-medium text-[#0b1220] placeholder:font-normal placeholder:text-[#c3ccd9]',
                              )}
                            />
                          </td>
                          <td className="px-1.5 py-1.5">
                            <select
                              disabled={locked}
                              value={UNIT_VALUES.includes(it.unit) ? it.unit : 'nos'}
                              onChange={(e) =>
                                updateItem(idx, 'unit', e.target.value)
                              }
                              className={cn(cell, 'text-[#64748b]')}
                            >
                              {UNITS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={locked}
                              value={it.qty}
                              onChange={(e) =>
                                updateItem(idx, 'qty', e.target.value)
                              }
                              className={cn(cell, 'text-right tabular-nums text-[#334155]')}
                            />
                          </td>
                          <td className="px-1.5 py-1.5">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={locked}
                              value={it.rate}
                              onChange={(e) =>
                                updateItem(idx, 'rate', e.target.value)
                              }
                              className={cn(cell, 'text-right tabular-nums text-[#334155]')}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right text-[12.5px] font-semibold tabular-nums text-[#0b1220]">
                            {formatInr(lineAmount(it))}
                          </td>
                          <td className="px-1.5 py-1.5">
                            <div className="flex justify-end gap-0.5 opacity-0 transition group-hover/row:opacity-100">
                              <button
                                type="button"
                                title="Duplicate line"
                                disabled={locked}
                                onClick={() => duplicateLine(idx)}
                                className="rounded-md p-1.5 text-[#9aa7ba] transition hover:bg-[#eef2f7] hover:text-[#334155] disabled:opacity-30"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete line"
                                disabled={locked}
                                onClick={() => removeLine(idx)}
                                className="rounded-md p-1.5 text-[#9aa7ba] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>

            <datalist id="boq-rooms">
              {ROOM_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

            {!locked && (
              <button
                type="button"
                onClick={() => addLine()}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-[12.5px] font-semibold text-[#2563eb] transition hover:bg-[#f7faff]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#eef4ff]">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                Add line
                <span className="font-normal text-[#b4c0d0]">
                  · press Enter in a description to insert below
                </span>
              </button>
            )}
          </div>

          {/* Status bar */}
          <div className="flex shrink-0 items-center gap-4 border-t border-[#edf1f7] bg-[#fafcfe] px-4 py-2 text-[11px] text-[#8a98ac] sm:px-5">
            <span>
              <span className="font-semibold tabular-nums text-[#475569]">
                {filledLines}
              </span>{' '}
              of {items.length} lines filled
            </span>
            <span className="hidden sm:inline">
              <span className="font-semibold tabular-nums text-[#475569]">
                {byRoom.length}
              </span>{' '}
              {byRoom.length === 1 ? 'room' : 'rooms'}
            </span>
            <span className="ml-auto">
              Subtotal{' '}
              <span className="font-semibold tabular-nums text-[#0b1220]">
                {formatInr(subtotal)}
              </span>
            </span>
          </div>
        </div>

        {/* Right panel */}
        <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-[324px] [&>section]:shrink-0">
          {/* Totals */}
          <section
            className={cn(CARD, 'overflow-hidden p-4')}
            style={{
              backgroundImage:
                'radial-gradient(360px 140px at 100% 0%, rgba(37,99,235,0.07), transparent 70%)',
            }}
          >
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#9aa7ba]">
              Grand total
            </p>
            <p className="mt-1 text-[28px] font-semibold tabular-nums leading-none tracking-[-0.03em] text-[#0b1220]">
              {formatInr(grand)}
            </p>

            <div className="mt-4 space-y-2.5 border-t border-[#eef2f7] pt-3 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-[#8a98ac]">Subtotal</span>
                <span className="font-semibold tabular-nums text-[#334155]">
                  {formatInr(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#8a98ac]">GST</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      disabled={locked}
                      value={gst}
                      onChange={(e) => {
                        markDirty()
                        setGst(Number(e.target.value))
                      }}
                      className="h-7 w-16 rounded-lg border border-[#e4eaf3] bg-[#f7f9fc] pl-2 pr-5 text-right text-[12px] tabular-nums text-[#334155] outline-none transition focus:border-[#b6cef7] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/10 disabled:opacity-50"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-[#9aa7ba]">
                      %
                    </span>
                  </div>
                  <span className="w-[84px] text-right font-semibold tabular-nums text-[#334155]">
                    {formatInr(gstAmount)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#8a98ac]">Discount</span>
                <input
                  type="number"
                  min="0"
                  disabled={locked}
                  value={discount}
                  onChange={(e) => {
                    markDirty()
                    setDiscount(Number(e.target.value))
                  }}
                  className="h-7 w-[124px] rounded-lg border border-[#e4eaf3] bg-[#f7f9fc] px-2 text-right text-[12px] tabular-nums text-[#334155] outline-none transition focus:border-[#b6cef7] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/10 disabled:opacity-50"
                />
              </div>
            </div>

            {!locked && (
              <>
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => save.mutate(payload())}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)] transition hover:bg-[#1d4ed8] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {save.isPending
                    ? 'Saving…'
                    : quotation
                      ? 'Save changes'
                      : 'Create BOQ'}
                </button>
                <p className="mt-1.5 text-center text-[10px] text-[#b4c0d0]">
                  Ctrl / ⌘ + S to save
                </p>
              </>
            )}
          </section>

          {/* Workflow */}
          {quotation && (
            <section className={cn(CARD, 'p-3.5')}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa7ba]">
                Workflow
              </h3>
              <div className="mt-2.5 space-y-1">
                <Step
                  index={1}
                  label="Draft"
                  hint="Build the sheet"
                  state={status === 'draft' ? 'current' : 'done'}
                />
                <Step
                  index={2}
                  label="Sent to client"
                  hint="Shared for approval"
                  state={
                    status === 'sent'
                      ? 'current'
                      : status === 'approved'
                        ? 'done'
                        : 'todo'
                  }
                />
                <Step
                  index={3}
                  label="Approved"
                  hint="Locks & sets budget"
                  state={status === 'approved' ? 'current' : 'todo'}
                  last
                />
              </div>

              <div className="mt-3 space-y-1.5">
                {status === 'draft' && (
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      if (dirty) {
                        toast('Save the sheet first, then mark sent', {
                          type: 'info',
                        })
                        return
                      }
                      save.mutate(payload({ status: 'sent' }))
                    }}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#d7e5fc] bg-[#eef4ff] text-[12.5px] font-semibold text-[#1d4ed8] transition hover:bg-[#e0ebff] disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Mark sent to client
                  </button>
                )}

                {(status === 'draft' || status === 'sent') && (
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Approve this BOQ?\n\nProject budget will be set to ${formatInr(grand)} and the sheet will lock.`,
                        )
                      )
                        return
                      save.mutate(payload({ status: 'approved' }))
                    }}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[12.5px] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(5,150,105,0.8)] transition hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve &amp; set budget
                  </button>
                )}

                {locked && (
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Reopen as draft? The sheet unlocks so you can revise it.',
                        )
                      )
                        return
                      save.mutate(payload({ status: 'draft' }))
                    }}
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#e4eaf3] bg-white text-[12px] font-semibold text-[#475569] transition hover:bg-[#f4f7fb]"
                  >
                    <Unlock className="h-3.5 w-3.5" />
                    Reopen as draft
                  </button>
                )}

                <button
                  type="button"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${quotation.title}"? This cannot be undone.`,
                      )
                    )
                      remove.mutate()
                  }}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#f3d7d7] bg-white text-[12px] font-semibold text-[#dc2626] transition hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete sheet
                </button>
              </div>
            </section>
          )}

          {/* Reference images */}
          <section className={cn(CARD, 'p-3.5')}>
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa7ba]">
                Reference images
              </h3>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  addGalleryImages(e.target.files)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={locked || uploading}
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#e4eaf3] bg-white px-2 text-[11px] font-semibold text-[#475569] transition hover:border-[#c7dbfb] hover:text-[#1d4ed8] disabled:opacity-40"
              >
                <Upload className="h-3 w-3" />
                {uploading ? 'Uploading…' : 'Add'}
              </button>
            </div>

            {attachments.length === 0 ? (
              <p className="mt-2.5 rounded-xl border border-dashed border-[#dde5ef] bg-[#fafcfe] px-3 py-5 text-center text-[11.5px] leading-relaxed text-[#9aa7ba]">
                Drop images anywhere on the sheet
                <br />
                or click Add
              </p>
            ) : (
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {attachments.map((a, i) => (
                  <div key={a.url + i} className="group relative">
                    <img
                      src={assetUrl(a.url)}
                      alt={a.name || ''}
                      onClick={() => setPreview(assetUrl(a.url))}
                      className="aspect-square w-full cursor-zoom-in rounded-xl object-cover ring-1 ring-[#e4eaf3] transition hover:ring-[#b6cef7]"
                    />
                    {!locked && (
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => {
                          markDirty()
                          setAttachments((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }}
                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-[#0f172a] text-white shadow-sm group-hover:flex"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Room breakdown */}
          {byRoom.length > 0 && subtotal > 0 && (
            <section className={cn(CARD, 'p-3.5')}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9aa7ba]">
                Cost by room
              </h3>
              <div className="mt-2.5 space-y-2.5">
                {byRoom.map(([room, amount]) => {
                  const pct = Math.round((amount / subtotal) * 100)
                  return (
                    <div key={room}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12px] font-medium text-[#334155]">
                          {room}
                        </span>
                        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#0b1220]">
                          {formatInr(amount)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#eef2f7]">
                          <div
                            className="h-full rounded-full bg-[#2563eb]/70 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-[10.5px] tabular-nums text-[#9aa7ba]">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </aside>
      </div>

      {preview && (
        <div
          role="presentation"
          onClick={() => setPreview(null)}
          className="on-dark fixed inset-0 z-[80] flex items-center justify-center bg-[#0f172a]/80 p-8 backdrop-blur-sm print:hidden"
        >
          <img
            src={preview}
            alt=""
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
          <button
            type="button"
            className="absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/20 transition hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <BoqPrintView
        title={title}
        versionLabel={versionLabel}
        project={project}
        status={status}
        items={items}
        attachments={attachments}
        subtotal={subtotal}
        gst={gst}
        gstAmount={gstAmount}
        discount={discount}
        grand={grand}
        byRoom={byRoom}
      />
    </>
  )
}

function ToolButton({ children, label, onClick, disabled }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg py-1.5 text-[#64748b] transition hover:bg-[#f4f7fb] hover:text-[#0b1220] disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function Step({ index, label, hint, state, last }) {
  return (
    <div className="relative flex gap-2.5 pb-2 last:pb-0">
      {!last && (
        <span
          className={cn(
            'absolute left-[10px] top-[22px] h-[calc(100%-14px)] w-px',
            state === 'done' ? 'bg-emerald-300' : 'bg-[#e4eaf3]',
          )}
        />
      )}
      <span
        className={cn(
          'relative z-[1] mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-white',
          state === 'done' && 'bg-emerald-500 text-white',
          state === 'current' && 'bg-[#2563eb] text-white',
          state === 'todo' && 'bg-[#eef2f7] text-[#b4c0d0]',
        )}
      >
        {state === 'done' ? <Check className="h-3 w-3" /> : index}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-[12.5px] font-semibold leading-tight',
            state === 'todo' ? 'text-[#b4c0d0]' : 'text-[#0b1220]',
          )}
        >
          {label}
        </p>
        <p className="text-[11px] leading-tight text-[#9aa7ba]">{hint}</p>
      </div>
    </div>
  )
}

/* ─────────────── Print document ─────────────── */

function BoqPrintView({
  title,
  versionLabel,
  project,
  status,
  items,
  attachments,
  subtotal,
  gst,
  gstAmount,
  discount,
  grand,
  byRoom,
}) {
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const rows = items.filter((it) => it.description?.trim() || lineAmount(it) > 0)

  return (
    <div className="hidden print:block">
      <header className="mb-6 flex items-start justify-between border-b-2 border-[#0b1220] pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
            EPM — Editco Project Management
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[#0b1220]">
            {title || 'Bill of Quantities'}
          </h1>
          <p className="mt-1 text-[12px] text-[#475569]">
            {project?.name || 'Project'}
            {project?.clientName ? ` · ${project.clientName}` : ''}
            {project?.location ? ` · ${project.location}` : ''}
          </p>
        </div>
        <div className="text-right text-[11px] text-[#64748b]">
          <p>
            Version:{' '}
            <span className="font-semibold text-[#0b1220]">
              {versionLabel || 'Standard'}
            </span>
          </p>
          <p className="mt-0.5">Date: {printDate}</p>
          <p className="mt-0.5 capitalize">
            Status: <span className="font-semibold text-[#0b1220]">{status}</span>
          </p>
        </div>
      </header>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-[#cbd5e1] text-left text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            <th className="w-10 py-2 pr-2">S.no</th>
            <th className="w-14 py-2 pr-2">Location</th>
            <th className="w-24 py-2 pr-2">Room</th>
            <th className="py-2 pr-2">Description</th>
            <th className="w-14 py-2 pr-2">Unit</th>
            <th className="w-14 py-2 pr-2 text-right">Qty</th>
            <th className="w-20 py-2 pr-2 text-right">Rate</th>
            <th className="w-24 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it, idx) => (
            <tr key={it._key} className="border-b border-[#e2e8f0]">
              <td className="py-1.5 pr-2 tabular-nums text-[#94a3b8]">
                {idx + 1}
              </td>
              <td className="py-1.5 pr-2">
                {it.image ? (
                  <img
                    src={assetUrl(it.image)}
                    alt=""
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : null}
              </td>
              <td className="py-1.5 pr-2 text-[#334155]">
                {it.room || 'General'}
              </td>
              <td className="py-1.5 pr-2 text-[#0b1220]">
                {it.description || '—'}
              </td>
              <td className="py-1.5 pr-2 text-[#64748b]">{unitLabel(it.unit)}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{it.qty}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {formatInr(it.rate)}
              </td>
              <td className="py-1.5 text-right font-semibold tabular-nums">
                {formatInr(lineAmount(it))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-[240px] space-y-1.5 text-[12px]">
          <div className="flex justify-between text-[#475569]">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatInr(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[#475569]">
            <span>GST ({gst || 0}%)</span>
            <span className="tabular-nums">{formatInr(gstAmount)}</span>
          </div>
          {(Number(discount) || 0) > 0 && (
            <div className="flex justify-between text-[#475569]">
              <span>Discount</span>
              <span className="tabular-nums">−{formatInr(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-[#0b1220] pt-2 text-[14px] font-bold text-[#0b1220]">
            <span>Grand total</span>
            <span className="tabular-nums">{formatInr(grand)}</span>
          </div>
        </div>
      </div>

      {byRoom.length > 1 && (
        <div className="mt-8 border-t border-[#e2e8f0] pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            Summary by room
          </p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px]">
            {byRoom.map(([room, amount]) => (
              <div key={room} className="flex justify-between gap-4">
                <span className="text-[#475569]">{room}</span>
                <span className="font-semibold tabular-nums text-[#0b1220]">
                  {formatInr(amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mt-8 border-t border-[#e2e8f0] pt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
            Reference images
          </p>
          <div className="grid grid-cols-3 gap-2">
            {attachments.map((a, i) => (
              <img
                key={a.url + i}
                src={assetUrl(a.url)}
                alt={a.name || ''}
                className="aspect-square w-full rounded object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <footer className="mt-10 border-t border-[#e2e8f0] pt-4 text-[10px] leading-relaxed text-[#94a3b8]">
        <p>
          This quotation is valid for 30 days from the date above unless
          otherwise agreed. Rates are in INR and exclusive of any items not
          listed. Prepared by EPM — Editco Project Management.
        </p>
      </footer>
    </div>
  )
}
