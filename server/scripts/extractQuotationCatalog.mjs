/**
 * Rebuilds server/src/data/quotationCatalog.raw.json from the two source
 * Cubic quotation workbooks in server/src/data/source/.
 *
 * The source sheets are hierarchical:
 *   residential  section (Sl.No)  ->  room sub-header  ->  item
 *   commercial   group            ->  section (S.NO)   ->  item (+ sized sub-rows)
 *
 * We flatten to an editable item list but keep every level on each row so the
 * quotation document can redraw the original headings, and we carry the trailing
 * blocks (charges, as-per-actuals, terms) that the BOQ sheet has to reproduce.
 *
 *   node server/scripts/extractQuotationCatalog.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('../../client/node_modules/xlsx')

const HERE = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(HERE, '..', 'src', 'data', 'source')
const OUT = join(HERE, '..', 'src', 'data', 'quotationCatalog.raw.json')

const text = (v) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const blank = (v) => text(v) === ''
const round = (n) => Math.round(n * 1e6) / 1e6

function sheetRows(file, sheet) {
  const wb = XLSX.readFile(join(SOURCE, file))
  const ws = wb.Sheets[sheet] || wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils
    .sheet_to_json(ws, { header: 1, raw: true, defval: null })
    .map((r) => r || [])
}

function mapUnit(raw) {
  const key = text(raw).toLowerCase().replace(/[^a-z]/g, '')
  if (['sqfts', 'sqft', 'sft', 'sqfeet', 'sqftsrfts'].includes(key)) return 'sft'
  if (['rft', 'rfts'].includes(key)) return 'rft'
  if (key === 'ls') return 'ls'
  if (['nos', 'no', 'nose'].includes(key)) return 'nos'
  if (key === 'load') return 'load'
  if (['rmt', 'rmtr'].includes(key)) return 'rmt'
  if (['sqm', 'sqmtr'].includes(key)) return 'sqm'
  return 'sft'
}

/* ────────────────────────────── residential ──────────────────────────────
 * A1:J820, header row 8:
 *   Sl.No | Description of item | Catogory | No | Width | Height | Qty | Rate | Amount | note
 * A numbered row that carries a category + rate is an item; a numbered row
 * without them opens a section. An un-numbered row with no figures is a room.
 */
function extractResidential() {
  const rows = sheetRows('residential-quotation.xlsx', 'Sheet3')
  const items = []
  const terms = []
  const actuals = []
  const charges = []

  let section = ''
  let sectionNo = ''
  let room = 'General'
  let phase = 'items' // items -> totals -> actuals -> terms

  for (let i = 8; i < rows.length; i += 1) {
    const r = rows[i]
    if (!r.some((c) => !blank(c))) continue

    const slNo = text(r[0])
    const desc = text(r[1]).replace(/\s+$/g, '')
    const category = text(r[2])
    const rate = r[7]
    const amount = r[8]

    if (/^sub\s*total$/i.test(desc)) {
      phase = 'totals'
      continue
    }
    if (/handling charges/i.test(desc)) {
      charges.push({
        label: desc,
        percent: num((desc.match(/([\d.]+)\s*%/) || [])[1]) || 8,
      })
      continue
    }
    if (/^total amount before gst$/i.test(desc)) continue
    if (/^items as per actuals/i.test(desc)) {
      phase = 'actuals'
      continue
    }
    if (/^note:?$/i.test(desc)) {
      phase = 'terms'
      continue
    }
    if (phase === 'terms') {
      if (/^\d+\./.test(desc)) terms.push(desc.replace(/^\d+\.\s*/, ''))
      continue
    }

    if (phase === 'actuals') {
      if (!desc) continue
      actuals.push({
        slNo,
        description: desc,
        category,
        qty: num(r[6]),
        // rate here is sometimes a range such as "280/140" — keep the source text
        rateText: blank(rate) ? '' : String(rate).trim(),
        note: text(r[9]),
      })
      continue
    }

    const hasFigures = !blank(rate) || !blank(amount) || !blank(r[6])
    const isItem = !!category && hasFigures

    if (!isItem) {
      if (!desc) continue
      if (slNo) {
        section = desc
        sectionNo = slNo
        room = desc
      } else {
        room = desc
      }
      continue
    }

    const measureNo = num(r[3])
    const width = num(r[4])
    const height = num(r[5])
    const qty = num(r[6]) || measureNo
    const rateNum = num(rate)

    items.push({
      slNo,
      section: section || 'General',
      sectionNo,
      room: room || 'General',
      description: desc,
      category,
      no: round(measureNo),
      width: round(width),
      height: round(height),
      qty: round(qty),
      rate: round(rateNum),
      amount: round(num(amount) || qty * rateNum),
      unit: mapUnit(category || 'sft'),
      note: text(r[9]),
    })
  }

  return {
    meta: {
      propertyType: 'Residential',
      documentTitle: 'QUOTATION FOR INTERIOR & EXECUTION',
      columns: [
        'Sl.No',
        'Description of item',
        'Catogory',
        'No',
        'Width',
        'Height',
        'Qty',
        'Rate',
        'Amount',
      ],
      hasMeasurements: true,
      gstNote: 'GST @18% Extra (the above quotation is exclusive of GST)',
    },
    charges: charges.length
      ? charges
      : [{ label: 'Design & Handling charges 8%', percent: 8 }],
    items,
    actuals: { title: 'Items as per Actuals and as per Bill', items: actuals },
    terms,
  }
}

/* ────────────────────────────── commercial ──────────────────────────────
 * Quote-R0 A1:N698, header row 8:
 *   S.NO. | ITEMS/DESCRIPTION/FINISHES | UNIT | QUANTITY | RATE | AMOUNT | .. | material | Service
 * Un-numbered heading rows open a group; integer-numbered heading rows open a
 * section; numbered rows with figures are items. A numbered row with a long
 * description and no figures is a spec header whose sized variants follow on
 * un-numbered rows.
 */
function extractCommercial() {
  const rows = sheetRows('commercial-quotation.xlsx', 'Quote-R0')
  const items = []
  const terms = []
  const paymentTerms = []
  const notQuoted = []
  const charges = []

  let group = ''
  let section = ''
  let sectionNo = ''
  let specHeader = ''
  let phase = 'items' // items -> notQuoted -> terms -> payment

  for (let i = 8; i < rows.length; i += 1) {
    const r = rows[i]
    if (!r.some((c) => !blank(c))) continue

    const slNo = text(r[0])
    const desc = text(r[1])
    const unit = text(r[2])
    const qtyRaw = r[3]
    const rateRaw = r[4]
    const amountRaw = r[5]

    if (/^sub\s*total$/i.test(desc)) {
      phase = 'totals'
      continue
    }
    if (/handling\s*\/?\s*services charges/i.test(desc)) {
      charges.push({
        label: desc,
        percent: num((desc.match(/([\d.]+)\s*%/) || [])[1]) || 8,
      })
      continue
    }
    if (/^grand total$/i.test(desc)) continue
    if (/^items not quoted$/i.test(desc)) {
      phase = 'notQuoted'
      continue
    }
    if (/^terms and conditions$/i.test(desc)) {
      phase = 'terms'
      continue
    }
    if (/^payment\s+terms$/i.test(desc)) {
      phase = 'payment'
      continue
    }
    if (phase === 'notQuoted') {
      if (desc) notQuoted.push(desc)
      continue
    }
    if (phase === 'terms') {
      if (desc) terms.push(desc)
      continue
    }
    if (phase === 'payment') {
      if (desc) paymentTerms.push(desc)
      continue
    }

    const hasFigures = !blank(rateRaw) || !blank(amountRaw)

    if (!hasFigures) {
      if (!desc) continue
      if (!slNo) {
        // un-numbered heading: a new group, unless it is a spec header that
        // precedes sized sub-rows (those carry a colon + body text)
        if (desc.length > 90 || /\n/.test(text(r[1]))) specHeader = desc
        else {
          group = desc
          section = ''
          sectionNo = ''
        }
      } else if (desc.length > 90 || /\n/.test(text(r[1]))) {
        // numbered spec header, e.g. "1.3 Glass Door : Single Leaf\nSupply and…"
        specHeader = desc
        sectionNo = slNo
      } else {
        section = desc
        sectionNo = slNo
        specHeader = ''
      }
      continue
    }

    // a sized sub-row inherits the spec header it sits under
    const description = !slNo && specHeader ? `${specHeader}\n${desc}` : desc
    if (slNo) specHeader = ''

    const qty = num(qtyRaw)
    const rate = num(rateRaw)

    items.push({
      slNo,
      group: group || 'General',
      section: section || group || 'General',
      sectionNo,
      room: group || 'General',
      description,
      category: section || group || 'General',
      no: 0,
      width: 0,
      height: 0,
      qty: round(qty),
      rate: round(rate),
      amount: round(num(amountRaw) || qty * rate),
      unit: mapUnit(unit),
      unitLabel: unit,
      note: '',
    })
  }

  return {
    meta: {
      propertyType: 'Commercial',
      documentTitle: 'Estimate for Renovation Works',
      columns: [
        'S.NO.',
        'ITEMS/ DESCRIPTION/ FINISHES',
        'UNIT',
        'QUANTITY',
        'RATE',
        'AMOUNT',
      ],
      hasMeasurements: false,
      gstNote: 'GST 18% EXTRA',
    },
    charges: charges.length
      ? charges
      : [{ label: 'Handling/Services charges 8%', percent: 8 }],
    items,
    notQuoted,
    terms,
    paymentTerms,
  }
}

const out = {
  residential: extractResidential(),
  commercial: extractCommercial(),
}

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`, 'utf8')

for (const [key, val] of Object.entries(out)) {
  const subtotal = val.items.reduce((s, it) => s + it.amount, 0)
  const sections = new Set(val.items.map((it) => it.section))
  console.log(
    `${key}: ${val.items.length} items · ${sections.size} sections · subtotal ${subtotal.toFixed(2)} · ${val.terms.length} terms`,
  )
}
console.log(`\nwrote ${OUT}`)
