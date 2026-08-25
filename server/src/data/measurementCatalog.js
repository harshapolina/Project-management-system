import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

/**
 * Commercial measurement take-off: the sheet where quantities are derived
 * (No's x L x W per space) before they reach the BOQ. Each item's total feeds
 * the BOQ line named in `boqRef`. Regenerate with:
 *   node server/scripts/extractMeasurementCatalog.mjs
 */
const RAW = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'measurementCatalog.raw.json'), 'utf8'),
)

export function hasMeasurementSheet(boqType) {
  return boqType === 'commercial'
}

const rowQty = (r) => {
  const nos = Number(r.nos) || 0
  const l = Number(r.length) || 0
  const w = Number(r.width) || 0
  if (nos && l && w) return nos * l * w
  if (nos && l) return nos * l
  return Number(r.qty) || nos || 0
}

const sumRows = (rows = []) => rows.reduce((s, r) => s + rowQty(r), 0)

/**
 * The source sheet does not always total its own rows: lump-sum work is
 * measured for reference but carried as 1, and a few items state a figure that
 * includes areas measured elsewhere. Where the stated total disagrees with the
 * rows we keep it as an editable override rather than silently recomputing.
 */
function seedOverride(it, rows) {
  const stated = Number(it.total) || 0
  if (!stated) return null
  const summed = sumRows(rows)
  if (!summed) return stated
  return Math.abs(summed - stated) > Math.max(1, stated * 0.02) ? stated : null
}

/**
 * Template for a new sheet. When `spaces` is given, only rows for those spaces
 * are carried over — that is the "pick your rooms first" step, so an office
 * without a training room never sees training-room rows.
 */
export function measurementTemplate(boqType = 'commercial', { spaces } = {}) {
  const block = RAW[boqType] || RAW.commercial
  const keep = spaces?.length ? new Set(spaces) : null

  const items = block.items.map((it) => {
    const rows = (keep ? it.rows.filter((r) => keep.has(r.space)) : it.rows).map((r) => ({
      space: r.space,
      unit: r.unit,
      nos: r.nos,
      length: r.length,
      width: r.width,
      qty: rowQty(r),
    }))
    return {
      group: it.group,
      sectionNo: it.sectionNo || '',
      sectionName: it.sectionName || '',
      no: it.no || '',
      name: it.name,
      unit: it.unit,
      rows,
      // only meaningful when the rooms were not filtered — a narrowed sheet
      // should total what it actually measures
      overrideTotal: keep ? null : seedOverride(it, rows),
      /** Roll-up printed against a section that spans several blocks (Paint) */
      boqTotal: it.boqTotal ?? null,
      boqTotalLabel: it.boqTotalLabel || '',
      boqRef: it.boqRef || null,
    }
  })

  return { meta: block.meta, spaces: block.spaces, items }
}

/** What this item contributes: the override if one is set, else its rows. */
export function itemTotal(it) {
  return it?.overrideTotal != null && it.overrideTotal !== ''
    ? Number(it.overrideTotal) || 0
    : sumRows(it?.rows)
}

/** Every space the source sheet measures, most-used first. */
export function measurementSpaces(boqType = 'commercial') {
  return (RAW[boqType] || RAW.commercial).spaces
}

/**
 * Item totals keyed by the BOQ line they feed, so the quote can pick up
 * quantities without the client having to re-derive the mapping.
 */
export function measurementTotals(items = []) {
  const out = new Map()
  const bySection = new Map()

  for (const it of items) {
    const total = itemTotal(it)
    const key = `${it.group}|${it.sectionName}`
    bySection.set(key, (bySection.get(key) || 0) + total)
    if (it.boqRef && it.boqRef.index >= 0) out.set(it.boqRef.index, { total, item: it })
  }

  // A section roll-up supersedes the single block that carries the reference.
  // The source states its own figure (TOTAL PAINT QUANTITY covers areas the
  // sub-blocks do not list), so honour that until it is cleared.
  for (const it of items) {
    // only the item the source printed a roll-up against carries one
    if (!it.boqTotalLabel || !it.boqRef || it.boqRef.index < 0) continue
    const key = `${it.group}|${it.sectionName}`
    const total =
      it.boqTotal == null || it.boqTotal === ''
        ? bySection.get(key) || 0
        : Number(it.boqTotal) || 0
    out.set(it.boqRef.index, { total, item: it })
  }
  return out
}

export { rowQty as measurementRowQty }
