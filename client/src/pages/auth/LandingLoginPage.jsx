import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  api,
  getTenantSlug,
  setTenantSlug,
  useAuthStore,
} from '../../lib/api'
import { Button, Input, toast } from '../../components/ui'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const loginSchema = z.object({
  workspace: z
    .string()
    .min(2, 'Workspace slug required')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Invalid slug'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const IMG = {
  collab:
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80',
  site: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80',
}

const TRUST = [
  'Design studios',
  'Fit-out contractors',
  'Architecture firms',
  'Project managers',
  'Site supervisors',
]

const STATS = [
  { n: '1', label: 'Private workspace', hint: 'Your company only' },
  { n: '8+', label: 'Connected modules', hint: 'Lead to handover' },
  { n: '4', label: 'Project views', hint: 'List · Board · Gantt · Cal' },
  { n: '∞', label: 'Tool chaos avoided', hint: 'One source of truth' },
]

const EVERYTHING = [
  {
    title: 'Tasks & priorities',
    body: 'Assigned, today, overdue, personal list, and done history — your ClickUp-style Home.',
  },
  {
    title: 'Boards & lists',
    body: 'Kanban and structured lists that stay in sync with the same underlying work.',
  },
  {
    title: 'Gantt & calendar',
    body: 'Timelines and dates for delivery — Jira-grade planning without the noise.',
  },
  {
    title: 'Planner',
    body: 'Week view plus Google Calendar so site visits never clash with desk work.',
  },
  {
    title: 'Channels & inbox',
    body: 'Team chat, @mentions, and assigned comments that don’t disappear in email.',
  },
  {
    title: 'Files & BOQ',
    body: 'Drawings, quotations, and bills of quantities attached to the live project.',
  },
  {
    title: 'Site & snags',
    body: 'Field updates, snags, and punch lists from supervisors on site.',
  },
  {
    title: 'Client portal',
    body: 'Share milestones and files with clients without another tool stack.',
  },
]

const VIEWS = [
  {
    id: 'list',
    label: 'List',
    caption: 'Structured work',
    rows: [
      { status: 'In progress', title: 'Approve FF&E package', meta: 'Urgent · Today' },
      { status: 'To do', title: 'Coordinate MEP clash', meta: 'High · Wed' },
      { status: 'Review', title: 'Client revision pack', meta: 'Normal · Fri' },
      { status: 'To do', title: 'Site walk — Level 3', meta: 'High · Tomorrow' },
    ],
  },
  {
    id: 'board',
    label: 'Board',
    caption: 'Kanban flow',
    cols: [
      { h: 'To do', items: ['Material samples', 'Vendor RFQ'] },
      { h: 'Doing', items: ['MEP coordination', 'Lighting layout'] },
      { h: 'Review', items: ['FF&E package'] },
      { h: 'Done', items: ['Concept freeze', 'BOQ v2'] },
    ],
  },
  {
    id: 'gantt',
    label: 'Gantt',
    caption: 'Timeline',
    bars: [
      { name: 'Concept', start: 0, w: 28 },
      { name: 'Design dev', start: 22, w: 36 },
      { name: 'Procurement', start: 48, w: 30 },
      { name: 'Fit-out', start: 62, w: 34 },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    caption: 'Week agenda',
    days: [
      { d: 'Mon', e: ['Kickoff'] },
      { d: 'Tue', e: [] },
      { d: 'Wed', e: ['Site visit', 'Design review'] },
      { d: 'Thu', e: ['Vendor call'] },
      { d: 'Fri', e: ['Client portal'] },
      { d: 'Sat', e: [] },
      { d: 'Sun', e: [] },
    ],
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Capture',
    body: 'Leads and enquiries land in one CRM — qualified, assigned, visible.',
  },
  {
    n: '02',
    title: 'Quote',
    body: 'Quotations and BOQ feed straight into the project you’re about to build.',
  },
  {
    n: '03',
    title: 'Deliver',
    body: 'Tasks, boards, procurement, and site snags run in the same workspace.',
  },
  {
    n: '04',
    title: 'Hand over',
    body: 'Files, finance, and the client portal close the job — documented.',
  },
]

const REPLACE = [
  { from: 'Spreadsheets', with: 'My Tasks + Planner' },
  { from: 'Slack threads', with: 'Channels + Inbox' },
  { from: 'Drive chaos', with: 'Project Files' },
  { from: 'WhatsApp site', with: 'Site & Snags' },
  { from: 'Email BOQs', with: 'Quotations & BOQ' },
  { from: 'Client PDFs', with: 'Client Portal' },
]

const MODULES = [
  'Leads & CRM',
  'Quotations & BOQ',
  'Projects & Files',
  'Planner',
  'Channels & Inbox',
  'Procurement',
  'Site & Snags',
  'Finance',
]

/* ─── Hero product UI (ClickUp / Jira style) ─── */
function HeroProduct() {
  return (
    <div className="lp-hero-product relative mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-black/8 bg-[#121214] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.45)]">
        {/* App chrome */}
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <div className="mx-auto flex items-center gap-2 rounded-md bg-white/5 px-3 py-1 text-[11px] text-white/40">
            <span className="h-3 w-3 rounded-sm bg-accent" />
            cubic.studio · Residence Kharghar
          </div>
        </div>

        <div className="grid md:grid-cols-[200px_1fr]">
          {/* Sidebar */}
          <aside className="hidden border-r border-white/8 bg-[#0f0f10] p-3 md:block">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Workspace
            </p>
            {[
              { l: 'Home', a: true },
              { l: 'Planner', a: false },
              { l: 'Projects', a: false },
              { l: 'Channels', a: false },
              { l: 'Inbox', a: false },
            ].map((i) => (
              <div
                key={i.l}
                className={`mb-0.5 rounded-md px-2.5 py-1.5 text-[12px] ${
                  i.a
                    ? 'bg-white/10 font-medium text-white'
                    : 'text-white/45'
                }`}
              >
                {i.l}
              </div>
            ))}
            <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Spaces
            </p>
            {['Residence', 'Office tower', 'Showroom'].map((s) => (
              <div
                key={s}
                className="mb-0.5 truncate rounded-md px-2.5 py-1.5 text-[12px] text-white/45"
              >
                {s}
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] text-white/40">Good evening, Rohan</p>
                <h3 className="text-[18px] font-semibold tracking-tight text-white">
                  My Tasks
                </h3>
              </div>
              <div className="flex gap-1.5">
                {['All', 'Assigned', 'Today', 'Done'].map((t, i) => (
                  <span
                    key={t}
                    className={`rounded-md px-2.5 py-1 text-[11px] ${
                      i === 0
                        ? 'bg-white/12 text-white'
                        : 'text-white/40'
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="lp-float-a rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
                  <span className="text-[11px] font-semibold text-white/70">
                    Assigned
                  </span>
                  <span className="ml-auto text-[10px] text-white/30">4</span>
                </div>
                {[
                  ['Approve material samples', 'Urgent'],
                  ['Site walk — Level 3', 'High'],
                  ['Lighting layout v4', 'Normal'],
                ].map(([t, p]) => (
                  <div
                    key={t}
                    className="mb-1 flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.04]"
                  >
                    <span className="h-3 w-3 rounded-full border border-white/25" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">
                      {t}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-semibold ${
                        p === 'Urgent'
                          ? 'text-red-400'
                          : p === 'High'
                            ? 'text-amber-400'
                            : 'text-white/35'
                      }`}
                    >
                      {p}
                    </span>
                  </div>
                ))}
              </div>

              <div className="lp-float-b rounded-xl border border-white/8 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-[11px] font-semibold text-white/70">
                    Today & overdue
                  </span>
                </div>
                {[
                  ['Client revision pack', 'Today'],
                  ['Vendor RFQ send', 'Overdue'],
                  ['Update portal files', 'Today'],
                ].map(([t, d]) => (
                  <div
                    key={t}
                    className="mb-1 flex items-center gap-2 rounded-lg px-1.5 py-1.5"
                  >
                    <span className="h-3 w-3 rounded-full border border-white/25" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">
                      {t}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] ${
                        d === 'Overdue' ? 'text-red-400' : 'text-accent/80'
                      }`}
                    >
                      {d}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lp-float-c mt-3 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-[11px] font-bold text-accent">
                +
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-white/80">
                  Daily summary ready
                </p>
                <p className="truncate text-[11px] text-white/35">
                  3 overdue · 2 due today · 1 assigned comment
                </p>
              </div>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-[#0a0a0a]">
                Open
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chips — ClickUp-style */}
      <div className="lp-chip-a absolute -left-2 top-16 hidden rounded-full border border-black/8 bg-white px-3 py-1.5 text-[11px] font-semibold shadow-lg sm:block md:-left-6">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
        Board synced
      </div>
      <div className="lp-chip-b absolute -right-2 top-28 hidden rounded-full border border-black/8 bg-white px-3 py-1.5 text-[11px] font-semibold shadow-lg sm:block md:-right-4">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        Site update
      </div>
      <div className="lp-chip-c absolute bottom-8 -left-1 hidden rounded-full border border-black/8 bg-white px-3 py-1.5 text-[11px] font-semibold shadow-lg md:block md:-left-8">
        Gantt · Fit-out phase
      </div>
    </div>
  )
}

function ViewPanel({ view }) {
  if (view.id === 'list') {
    return (
      <div className="space-y-1.5">
        {view.rows.map((r) => (
          <div
            key={r.title}
            className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white px-4 py-3"
          >
            <span className="h-3.5 w-3.5 rounded-full border border-black/20" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#0a0a0a]">
                {r.title}
              </p>
              <p className="text-[11px] text-black/40">{r.meta}</p>
            </div>
            <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-black/45">
              {r.status}
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (view.id === 'board') {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {view.cols.map((c) => (
          <div key={c.h} className="rounded-xl bg-black/[0.03] p-2.5">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-black/40">
              {c.h}
            </p>
            {c.items.map((item) => (
              <div
                key={item}
                className="mb-1.5 rounded-lg border border-black/[0.06] bg-white px-2.5 py-2 text-[12px] font-medium"
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }
  if (view.id === 'gantt') {
    return (
      <div className="space-y-3 rounded-xl border border-black/[0.06] bg-white p-4">
        {view.bars.map((b) => (
          <div key={b.name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-[12px] font-medium text-black/60">
              {b.name}
            </span>
            <div className="relative h-7 flex-1 rounded-md bg-black/[0.04]">
              <div
                className="absolute top-1 h-5 rounded-md bg-accent/80"
                style={{ left: `${b.start}%`, width: `${b.w}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {view.days.map((day) => (
        <div
          key={day.d}
          className="min-h-[100px] rounded-xl border border-black/[0.06] bg-white p-2"
        >
          <p className="mb-2 text-center text-[10px] font-semibold text-black/35">
            {day.d}
          </p>
          {day.e.map((ev) => (
            <div
              key={ev}
              className="mb-1 rounded-md bg-accent/25 px-1.5 py-1 text-[9px] font-semibold text-[#3d7a1f]"
            >
              {ev}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function LoginPage() {
  const root = useRef(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState('list')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      workspace: getTenantSlug() || 'cubic',
      email: 'rohan@cubic.studio',
      password: 'demo1234',
    },
  })

  const currentView = VIEWS.find((v) => v.id === activeView) || VIEWS[0]

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) return

      const ease = 'expo.out'

      const tl = gsap.timeline({ defaults: { ease } })
      tl.from('.lp-nav', { y: -16, opacity: 0, duration: 0.6 })
        .from(
          '.lp-hero-copy > *',
          { y: 28, opacity: 0, stagger: 0.08, duration: 0.75 },
          '-=0.35',
        )
        .from(
          '.lp-hero-product',
          { y: 48, opacity: 0, scale: 0.97, duration: 1 },
          '-=0.45',
        )
        .from(
          '.lp-chip-a, .lp-chip-b, .lp-chip-c',
          { y: 12, opacity: 0, stagger: 0.1, duration: 0.5 },
          '-=0.5',
        )

      gsap.to('.lp-float-a', {
        y: -6,
        duration: 2.8,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
      gsap.to('.lp-float-b', {
        y: 5,
        duration: 3.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: 0.4,
      })
      gsap.to('.lp-float-c', {
        y: -4,
        duration: 2.6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: 0.8,
      })
      gsap.to('.lp-chip-a', {
        y: -4,
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      })
      gsap.to('.lp-chip-b', {
        y: 5,
        duration: 2.7,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: 0.3,
      })
      gsap.to('.lp-chip-c', {
        y: -3,
        duration: 3.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: 0.6,
      })

      const reveal = (targets, from, trigger, start = 'top 88%') => {
        gsap.fromTo(
          targets,
          { opacity: 0, ...from },
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease,
            stagger: from.stagger,
            immediateRender: false,
            scrollTrigger: {
              trigger,
              start,
              once: true,
            },
          },
        )
      }

      reveal('.lp-trust-item', { y: 12, stagger: 0.05 }, '.lp-trust', 'top 92%')
      reveal('.lp-stat', { y: 24, stagger: 0.08 }, '.lp-stats', 'top 85%')
      reveal('.lp-sec-head > *', { y: 20, stagger: 0.08 }, '.lp-everything', 'top 85%')
      reveal('.lp-feat', { y: 20, stagger: 0.05 }, '.lp-feat-grid', 'top 88%')
      reveal('.lp-views-head > *', { y: 20, stagger: 0.08 }, '.lp-views', 'top 85%')
      reveal('.lp-views-panel', { y: 28 }, '.lp-views', 'top 75%')
      reveal('.lp-step', { y: 24, stagger: 0.1 }, '.lp-workflow', 'top 82%')
      reveal('.lp-replace-row', { y: 16, stagger: 0.06 }, '.lp-replace', 'top 85%')
      reveal('.lp-collab-copy > *', { y: 24, stagger: 0.1 }, '.lp-collab', 'top 78%')
      gsap.fromTo(
        '.lp-collab-img',
        { scale: 1.06, opacity: 0.5 },
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease,
          immediateRender: false,
          scrollTrigger: { trigger: '.lp-collab', start: 'top 78%', once: true },
        },
      )
      reveal('.lp-mod-cell', { y: 14, stagger: 0.04 }, '.lp-mod-grid', 'top 88%')
      reveal('.lp-enter-left', { x: -28 }, '#enter', 'top 82%')
      reveal('.lp-enter-right', { x: 28 }, '#enter', 'top 82%')

      requestAnimationFrame(() => ScrollTrigger.refresh())
    },
    { scope: root },
  )

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      setTenantSlug(values.workspace)
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      })
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tenant: data.tenant || null,
      })
      toast('Welcome back', { type: 'success' })
      if (data.user.mustChangePassword) navigate('/settings')
      else if (data.user.role === 'site_supervisor') navigate('/mobile')
      else if (!data.user.onboardingCompleted) navigate('/onboarding')
      else if (data.user.isPlatformAdmin) navigate('/platform')
      else navigate('/')
    } catch (err) {
      toast(err.message || 'Login failed', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={root}
      className="lp-root min-h-screen overflow-x-hidden bg-white text-[#0a0a0a]"
      style={{ fontFamily: 'var(--font-landing)' }}
    >
      {/* ── 1. HERO (ClickUp / Jira style: copy + product UI) ── */}
      <section className="lp-hero relative overflow-hidden bg-[#f7f7f8]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(198,255,61,0.14),_transparent_55%)]" />

        <header className="lp-nav relative z-20 mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[12px] font-bold text-[#0a0a0a]">
              C
            </span>
            <span className="text-[16px] font-semibold tracking-tight">Cubic</span>
          </a>
          <nav className="hidden items-center gap-7 text-[13px] text-black/45 md:flex">
            <a href="#product" className="transition-colors hover:text-black">
              Product
            </a>
            <a href="#views" className="transition-colors hover:text-black">
              Views
            </a>
            <a href="#modules" className="transition-colors hover:text-black">
              Modules
            </a>
            <a href="#enter" className="transition-colors hover:text-black">
              Sign in
            </a>
          </nav>
          <a
            href="#enter"
            className="rounded-full bg-[#0a0a0a] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-black/80"
          >
            Enter workspace
          </a>
        </header>

        <div
          id="top"
          className="relative z-10 mx-auto max-w-6xl px-4 pb-6 pt-10 text-center md:px-6 md:pb-10 md:pt-16"
        >
          <div className="lp-hero-copy mx-auto max-w-3xl">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#3d7a1f]">
              Interior project OS
            </p>
            <h1 className="text-[clamp(2.4rem,6.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[#0a0a0a]">
              One workspace.
              <br />
              <span className="text-black/35">Every project view.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-black/50 md:text-[17px]">
              Tasks, boards, Gantt, planner, BOQ, site, and channels — the
              ClickUp-level command center built for studios that ship spaces.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#enter"
                className="rounded-full bg-[#0a0a0a] px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-black/80"
              >
                Sign in to Cubic
              </a>
              <a
                href="#product"
                className="rounded-full border border-black/12 bg-white px-6 py-3 text-[14px] font-semibold text-[#0a0a0a] transition hover:border-black/25"
              >
                See product
              </a>
            </div>
          </div>

          <div className="mt-12 md:mt-16">
            <HeroProduct />
          </div>
        </div>
      </section>

      {/* ── 2. TRUST ── */}
      <section className="lp-trust border-y border-black/[0.06] bg-white px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 md:justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/30">
            Built for
          </p>
          {TRUST.map((t) => (
            <span
              key={t}
              className="lp-trust-item text-[13px] font-semibold text-black/28"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── 3. STATS ── */}
      <section className="lp-stats bg-white px-4 py-14 md:px-6 md:py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="lp-stat">
              <p className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tracking-tight">
                {s.n}
              </p>
              <p className="mt-1 text-[14px] font-semibold">{s.label}</p>
              <p className="mt-0.5 text-[12px] text-black/40">{s.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. EVERYTHING (ClickUp “replace your tools”) ── */}
      <section
        id="product"
        className="lp-everything bg-[#f7f7f8] px-4 py-16 md:px-6 md:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="lp-sec-head max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3d7a1f]">
              Product
            </p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight">
              Everything your studio needs — in one OS
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-black/50">
              Stop juggling ten apps. Cubic brings the surfaces PMs expect from
              ClickUp and Jira, tuned for interior delivery.
            </p>
          </div>

          <div className="lp-feat-grid mt-12 grid gap-px overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.06] sm:grid-cols-2 lg:grid-cols-4">
            {EVERYTHING.map((f) => (
              <div
                key={f.title}
                className="lp-feat bg-[#f7f7f8] p-5 transition-colors duration-300 hover:bg-white"
              >
                <h3 className="text-[14px] font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-black/45">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. VIEWS SWITCHER (ClickUp-style) ── */}
      <section id="views" className="lp-views bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="lp-views-head flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3d7a1f]">
                Views
              </p>
              <h2 className="mt-2 text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight">
                Same work. Four ways to see it.
              </h2>
            </div>
            <div className="flex flex-wrap gap-1 rounded-full border border-black/10 bg-[#f7f7f8] p-1">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveView(v.id)}
                  className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                    activeView === v.id
                      ? 'bg-[#0a0a0a] text-white'
                      : 'text-black/45 hover:text-black'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-[13px] text-black/40">{currentView.caption}</p>

          <div className="lp-views-panel mt-8 rounded-2xl border border-black/[0.06] bg-[#f7f7f8] p-4 md:p-6">
            <ViewPanel view={currentView} />
          </div>
        </div>
      </section>

      {/* ── 6. WORKFLOW ── */}
      <section className="lp-workflow bg-[#0a0a0a] px-4 py-16 text-white md:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            How it works
          </p>
          <h2 className="mt-2 max-w-lg text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight">
            Lead to handover — four moves
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="lp-step relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute left-8 top-3 hidden h-px w-[calc(100%-2rem)] bg-white/10 lg:block" />
                )}
                <p className="relative text-[13px] font-semibold tabular-nums text-accent">
                  {s.n}
                </p>
                <h3 className="relative mt-3 text-[17px] font-semibold">
                  {s.title}
                </h3>
                <p className="relative mt-2 text-[13px] leading-relaxed text-white/45">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. REPLACE STACK ── */}
      <section className="lp-replace bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3d7a1f]">
              Consolidate
            </p>
            <h2 className="mt-2 text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight">
              Replace the tool pile
            </h2>
            <p className="mt-3 text-[15px] text-black/50">
              Like ClickUp’s “one app to replace them all” — for interior
              delivery.
            </p>
          </div>
          <div className="mt-10 divide-y divide-black/[0.06] border-y border-black/[0.06]">
            {REPLACE.map((r) => (
              <div
                key={r.from}
                className="lp-replace-row grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4 md:gap-8"
              >
                <p className="text-[14px] text-black/35 line-through">{r.from}</p>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  →
                </span>
                <p className="text-[14px] font-semibold">{r.with}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. COLLABORATION ── */}
      <section className="lp-collab grid min-h-[60vh] overflow-hidden bg-[#f7f7f8] lg:grid-cols-2">
        <div className="relative min-h-[280px] overflow-hidden">
          <img
            src={IMG.collab}
            alt="Interior project space"
            loading="lazy"
            className="lp-collab-img absolute inset-0 h-full w-full object-cover"
            style={{ filter: 'grayscale(0.25) brightness(0.9)' }}
          />
        </div>
        <div className="lp-collab-copy flex flex-col justify-center px-6 py-14 md:px-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#3d7a1f]">
            Collaboration
          </p>
          <h2
            className="mt-3 max-w-md text-[clamp(1.5rem,3vw,2.2rem)] font-normal leading-[1.15]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Desk, site, and client — same thread.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-black/50">
            Channels, inbox, assigned comments, and a client portal keep every
            stakeholder aligned — no WhatsApp archaeology.
          </p>
          <ul className="mt-7 space-y-2.5 text-[14px] font-medium text-black/70">
            {[
              'Team channels & @mentions',
              'Assigned comments that stick to tasks',
              'Client portal for milestones & files',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 9. MODULES ── */}
      <section
        id="modules"
        className="lp-modules bg-[#0a0a0a] px-4 py-16 text-white md:px-6 md:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h2 className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold tracking-tight">
              Full suite
            </h2>
            <p className="max-w-xs text-[13px] text-white/40">
              Eight modules. One private company workspace.
            </p>
          </div>
          <div className="lp-mod-grid mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <div
                key={m}
                className="lp-mod-cell bg-[#0a0a0a] px-5 py-5 text-[14px] font-medium transition-colors hover:bg-white/[0.05]"
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. SIGN IN ── */}
      <section id="enter" className="bg-[#f7f7f8] px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:grid-cols-2">
          <div className="lp-enter-left relative overflow-hidden bg-[#0a0a0a] px-7 py-10 text-white md:px-10 md:py-12">
            <img
              src={IMG.site}
              alt=""
              loading="lazy"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
              style={{ filter: 'grayscale(0.5)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/65" />
            <div className="relative z-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                Enter
              </p>
              <h2
                className="mt-3 text-[clamp(1.5rem,3vw,2.1rem)] font-normal leading-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Sign in to your company workspace
              </h2>
              <p className="mt-4 text-[14px] leading-relaxed text-white/50">
                Workspace slug + credentials from your admin — or Editco for
                platform access.
              </p>
              <p className="mt-8 text-[11px] text-white/30">
                Demo · cubic · rohan@cubic.studio · demo1234
              </p>
            </div>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="lp-enter-right space-y-3.5 px-7 py-10 md:px-10 md:py-12"
          >
            <Input
              label="Workspace"
              placeholder="your-company"
              light
              autoComplete="organization"
              error={errors.workspace?.message}
              {...register('workspace')}
            />
            <Input
              label="Email"
              type="email"
              light
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              light
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-[12px] text-black/40 hover:text-black"
              >
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="w-full !rounded-full !bg-black hover:!bg-black/85"
            >
              Sign in
            </Button>
          </form>
        </div>
      </section>

      <footer className="border-t border-black/[0.06] bg-white px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[10px] font-bold text-[#0a0a0a]">
              C
            </span>
            <span className="text-[13px] font-semibold">Cubic</span>
          </div>
          <p className="text-[12px] text-black/35">by Editco</p>
        </div>
      </footer>
    </div>
  )
}
