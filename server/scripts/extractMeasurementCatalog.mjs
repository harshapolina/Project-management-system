/**
 * Builds server/src/data/measurementCatalog.raw.json from the commercial
 * take-off sheet in server/src/data/source/commercial-measurements.csv.
 *
 * The sheet is where commercial quantities are actually derived: every work
 * item lists the spaces it occurs in with No's x L x W, and the item TOTAL is
 * what lands in the BOQ quantity column. We keep the group / section / item
 * shape, the per-space rows as defaults, and the distinct space list so a new
 * project can start by ticking the rooms it has.
 *
 *   node server/scripts/extractMeasurementCatalog.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, '..', 'src', 'data', 'source', 'commercial-measurements.csv')
const OUT = join(HERE, '..', 'src', 'data', 'measurementCatalog.raw.json')

const GROUPS = {
  Dismantling: 'Dismantling Work',
  'Civil Work': 'Civil Works',
  'Modular Glass Work': 'Modular Glass Works',
  'Interior Works': 'Interior Works',
}

function parseCsv(text) {
  return text.split(/\r?\n/).map((line) => {
    const out = []
    let cur = ''
    let quoted = false
    for (const ch of line) {
      if (ch === '"') {
        quoted = !quoted
        continue
      }
      if (ch === ',' && !quoted) {
        out.push(cur)
        cur = ''
        continue
      }
      cur += ch
    }
    out.push(cur)
    return out.map((s) => s.trim())
  })
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function mapUnit(raw) {
  const key = String(raw || '').toLowerCase().replace(/[^a-z]/g, '')
  if (['sqfts', 'sqft', 'sft'].includes(key)) return 'sft'
  if (['rft', 'rfts'].includes(key)) return 'rft'
  if (['nos', 'no'].includes(key)) return 'nos'
  if (key === 'ls') return 'ls'
  if (key === 'load') return 'load'
  return 'sft'
}

const rows = parseCsv(readFileSync(SRC, 'utf8'))

const items = []
const spaceCounts = new Map()

let group = ''
let pending = [] // heading rows seen since the last measurement row
let section = { no: '', name: '' } // persists across sibling blocks (e.g. Paint)
let current = null

/** "1", "22" open a section of their own; "1.1", "3.2" are items inside one. */
const isSectionNo = (no) => /^\d+$/.test(String(no || '').trim())

const flushHeadings = () => {
  // The heading closest to the measurements names the item; anything above it
  // opens the section. A lone heading either opens its own section (whole
  // number) or stays inside the open one — which is what keeps Paint's two
  // sub-blocks under Paint without Granite Work leaking onto Plumbing Works.
  const head = pending[pending.length - 1] || { no: '', name: '(unnamed)' }
  if (pending.length > 1) section = pending[0]
  else if (isSectionNo(head.no)) section = head
  current = {
    group: GROUPS[group] || group,
    sectionNo: section.no || '',
    sectionName: section.name || '',
    no: head.no || '',
    name: head.name,
    unit: 'sft',
    rows: [],
    total: 0,
  }
  items.push(current)
  pending = []
}

for (let i = 1; i < rows.length; i += 1) {
  const r = rows[i]
  if (!r.some((c) => c !== '')) continue
  const [slNo, desc, unit, nos, L, W, qty] = r

  if (GROUPS[desc]) {
    group = desc
    pending = []
    section = { no: '', name: '' }
    current = null
    continue
  }

  if (/^TOTAL/i.test(desc)) {
    // A plain TOTAL closes the item — the source sometimes prints a running
    // sub-total then the figure it actually carries forward, so the last one
    // wins. "TOTAL <something>" is a section roll-up across sibling blocks
    // (TOTAL PAINT QUANTITY); it belongs to the section, not to this item.
    if (!current) continue
    if (/^TOTAL$/i.test(desc)) current.total = num(qty)
    else current.sectionTotal = { label: desc, value: num(qty) }
    continue
  }

  if (!unit) {
    // heading row — buffer it until we learn whether it is a section or the item
    pending.push({ no: slNo, name: desc })
    current = null
    continue
  }

  // measurement row
  if (!current) {
    if (!pending.length) pending.push({ no: slNo, name: desc || '(unnamed)' })
    flushHeadings()
  }
  const space = desc || current.rows[current.rows.length - 1]?.space || 'Office'
  current.unit = mapUnit(unit)
  current.rows.push({
    space,
    unit: mapUnit(unit),
    nos: num(nos),
    length: num(L),
    width: num(W),
    qty: num(qty),
  })
  spaceCounts.set(space, (spaceCounts.get(space) || 0) + 1)
}

/**
 * A section roll-up (TOTAL PAINT QUANTITY) is the figure the BOQ carries for
 * the whole section, so hang it on the section's first item as boqTotal and
 * leave every block's own total intact for the sheet.
 */
for (const it of items) {
  if (!it.sectionTotal) continue
  const siblings = items.filter(
    (x) => x.group === it.group && x.sectionName === it.sectionName,
  )
  siblings[0].boqTotal = it.sectionTotal.value
  siblings[0].boqTotalLabel = it.sectionTotal.label
  for (const s of siblings) delete s.sectionTotal
}

/* ── link each take-off item to the BOQ line its total feeds ──────────────
 * Quantity is the ground truth (the sheet total IS the BOQ quantity), so match
 * on it wherever the figure is distinctive, and fall back to name similarity
 * for the lump-sum lines where every quantity is 1.
 */
const QUOTES = JSON.parse(
  readFileSync(join(HERE, '..', 'src', 'data', 'quotationCatalog.raw.json'), 'utf8'),
).commercial.items

/** Pairs the heuristics cannot see — the wording simply does not overlap. */
const OVERRIDES = {
  'Interior Works|House Keeping': 'Regular cleaning and maintenance',
}
/** Take-off items that legitimately have no BOQ line of their own. */
const NO_BOQ_LINE = new Set([
  'Interior Works|Sprinkler', // sits under ITEMS NOT QUOTED
])

const normText = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const words = (s) => new Set(String(s || '').toLowerCase().match(/[a-z]{3,}/g) || [])
const headline = (qi) => qi.description.split(/[\n:]/)[0]

function nameScore(mi, qi) {
  if (normText(mi.group) !== normText(qi.group)) return -1
  let s = 3
  const a = words(mi.name)
  const b = words(`${headline(qi)} ${qi.section}`)
  let hit = 0
  for (const t of a) if (b.has(t)) hit += 1
  s += a.size ? (hit / a.size) * 6 : 0
  if (mi.no && qi.slNo && mi.no === qi.slNo) s += 2.5
  if (normText(mi.sectionName) && normText(mi.sectionName) === normText(qi.section)) s += 2
  return s
}

const taken = new Set()
const linkOf = new Array(items.length)

items.forEach((mi, k) => {
  const key = `${mi.group}|${mi.name}`
  const override = OVERRIDES[key]
  if (!override) return
  const i = QUOTES.findIndex((qi) => headline(qi).includes(override))
  if (i >= 0) {
    taken.add(i)
    linkOf[k] = { i, via: 'override' }
  }
})

items.forEach((mi, k) => {
  if (linkOf[k] || NO_BOQ_LINE.has(`${mi.group}|${mi.name}`)) return
  const target = mi.boqTotal || mi.total
  if (target <= 3) return
  const hit = QUOTES.map((qi, i) => ({ i, d: Math.abs(qi.qty - target) }))
    .filter((c) => !taken.has(c.i) && c.d <= Math.max(1, target * 0.01))
    .sort((a, b) => a.d - b.d)[0]
  if (hit) {
    taken.add(hit.i)
    linkOf[k] = { i: hit.i, via: 'qty' }
  }
})

items.forEach((mi, k) => {
  if (linkOf[k] || NO_BOQ_LINE.has(`${mi.group}|${mi.name}`)) return
  let best = null
  let bestScore = 5.9
  QUOTES.forEach((qi, i) => {
    if (taken.has(i)) return
    const s = nameScore(mi, qi)
    if (s > bestScore) {
      bestScore = s
      best = i
    }
  })
  if (best != null) {
    taken.add(best)
    linkOf[k] = { i: best, via: 'name' }
  }
})

items.forEach((mi, k) => {
  const link = linkOf[k]
  if (!link) {
    mi.boqRef = null
    return
  }
  const qi = QUOTES[link.i]
  mi.boqRef = {
    index: link.i,
    slNo: qi.slNo || '',
    section: qi.section || '',
    label: headline(qi).slice(0, 90),
    matchedBy: link.via,
  }
})

const unlinked = items.filter((i) => !i.boqRef)

const spaces = [...spaceCounts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([name, uses]) => ({ name, uses }))

const out = {
  commercial: {
    meta: {
      title: 'Measurement take-off',
      columns: ['Description', 'Units', "No's", 'L', 'W', 'Qty'],
      note: 'Item totals drive the quantity of the matching BOQ line.',
    },
    spaces,
    items,
  },
}

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8')

console.log(
  `commercial: ${items.length} items · ${spaces.length} spaces · ${items.reduce((s, i) => s + i.rows.length, 0)} measurement rows`,
)
console.log(
  `linked to BOQ: ${items.length - unlinked.length}/${items.length}` +
    (unlinked.length ? ` — unlinked: ${unlinked.map((i) => i.name).join(', ')}` : ''),
)
console.log(`\ntop spaces: ${spaces.slice(0, 12).map((s) => `${s.name} (${s.uses})`).join(', ')}`)
console.log(`\nwrote ${OUT}`)
