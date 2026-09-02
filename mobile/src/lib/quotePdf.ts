import * as Print from 'expo-print'
import { sharePdf } from './exportFile'
import type { BoqItem, Quotation } from '../types/ops'
import type { Tenant } from '../types/models'

/**
 * Branded quotation PDF — the mobile counterpart of the web client's
 * CubicQuoteDocument. Rendered as print HTML through expo-print so a
 * quotation built on site can actually be sent from there.
 */

const UNIT_LABEL: Record<string, string> = {
  sft: 'Sq.fts',
  rft: 'Rfts',
  nos: "No's",
  ls: 'LS',
  load: 'Load',
  sqm: 'Sq.m',
  rmt: 'Rmt',
  sheet: 'Sheet',
}

/**
 * Measurements drive quantity when all three are present, at full precision —
 * rounding here would drift the sheet total away from the stored quotation.
 */
export function lineQty(it: BoqItem): number {
  const no = Number(it.measureNo) || 0
  const w = Number(it.width) || 0
  const h = Number(it.height) || 0
  if (no && w && h) return no * w * h
  return Number(it.qty) || no || 0
}

function lineAmount(it: BoqItem): number {
  return lineQty(it) * (Number(it.rate) || 0)
}

function unitLabel(it: BoqItem): string {
  return it.unitLabel || UNIT_LABEL[it.unit] || it.unit || 'Sq.fts'
}

function inr(n?: number): string {
  const value = Number(n) || 0
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function num(n?: number): string {
  return Number(n) ? Number(Number(n).toFixed(3)).toLocaleString('en-IN') : '—'
}

function esc(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Heading rows are re-inserted where the source sheet had them. */
type Block =
  | { kind: 'group' | 'section' | 'room'; title: string; no?: string }
  | { kind: 'item'; item: BoqItem; index: number }

function buildBlocks(rows: BoqItem[]): Block[] {
  const blocks: Block[] = []
  let group: string | null = null
  let section: string | null = null
  let room: string | null = null
  const generic = (v?: string) => !v || v === 'General'

  rows.forEach((it, index) => {
    const g = it.group?.trim() || ''
    const s = it.section?.trim() || ''
    const r = it.room?.trim() || ''

    if (g && !generic(g) && g !== group) {
      blocks.push({ kind: 'group', title: g })
      group = g
      section = null
      room = null
    }
    if (s && !generic(s) && s !== section && s !== g) {
      blocks.push({ kind: 'section', title: s, no: it.sectionNo || '' })
      section = s
      room = null
    }
    if (r && !generic(r) && r !== room && r !== s && r !== g) {
      blocks.push({ kind: 'room', title: r })
      room = r
    }
    blocks.push({ kind: 'item', item: it, index })
  })

  return blocks
}

export interface QuotePdfOptions {
  quotation: Quotation
  tenant?: Tenant | null
  projectName?: string
  clientName?: string
  /** Optional terms lists carried by the workspace template. */
  terms?: string[]
  paymentTerms?: string[]
}

function buildHtml({
  quotation,
  tenant,
  projectName,
  clientName,
  terms = [],
  paymentTerms = [],
}: QuotePdfOptions): string {
  const rows = (quotation.items || []).filter(
    (it) => it.description?.trim() || lineAmount(it) > 0,
  )
  const blocks = buildBlocks(rows)

  const subtotal = rows.reduce((s, it) => s + lineAmount(it), 0)
  const charges = (subtotal * (Number(quotation.chargesPercent) || 0)) / 100
  const taxable = subtotal + charges
  const gstAmount = (taxable * (Number(quotation.gstPercent) || 0)) / 100
  const grand = Math.max(0, taxable + gstAmount - (Number(quotation.discount) || 0))

  const measured = quotation.boqType !== 'commercial'
  // Residential sheets band in green, commercial estimates in the source pink.
  const accent = measured ? '#e8f0e4' : '#e8b7cd'

  const company = tenant?.name || 'CUBIC ASSOCIATES PVT. LTD.'
  const quoteDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const docNo =
    quotation.status === 'draft' ? 'DRAFT' : (quotation.status || '').toUpperCase()

  const project =
    projectName ||
    (quotation.projectId && typeof quotation.projectId === 'object'
      ? quotation.projectId.name
      : '') ||
    ''
  const client =
    clientName ||
    (quotation.projectId && typeof quotation.projectId === 'object'
      ? quotation.projectId.clientName
      : '') ||
    ''

  const bodyRows = blocks
    .map((block) => {
      if (block.kind === 'item') {
        const it = block.item
        return `<tr>
          <td class="c">${esc(it.slNo || block.index + 1)}</td>
          <td>${esc(it.description).replace(/\n/g, '<br/>')}${
            it.note ? `<div class="note">${esc(it.note)}</div>` : ''
          }</td>
          <td class="c">${esc(unitLabel(it))}</td>
          <td class="r">${num(lineQty(it))}</td>
          <td class="r">${inr(it.rate)}</td>
          <td class="r">${inr(lineAmount(it))}</td>
        </tr>`
      }
      const cls = block.kind === 'group' ? 'group' : block.kind === 'section' ? 'section' : 'room'
      const label = block.kind === 'section' && block.no ? `${block.no}. ${block.title}` : block.title
      return `<tr class="${cls}"><td colspan="6">${esc(label)}</td></tr>`
    })
    .join('')

  const termsHtml =
    terms.length || paymentTerms.length
      ? `<section class="sheet terms">
          ${
            terms.length
              ? `<h2>Terms &amp; conditions</h2><ol>${terms
                  .map((t) => `<li>${esc(t)}</li>`)
                  .join('')}</ol>`
              : ''
          }
          ${
            paymentTerms.length
              ? `<h2>Payment terms</h2><ol>${paymentTerms
                  .map((t) => `<li>${esc(t)}</li>`)
                  .join('')}</ol>`
              : ''
          }
        </section>`
      : ''

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10px;
    color: #2b2b2b;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .letterhead { border-bottom: 2px solid #1f2d24; padding-bottom: 10px; margin-bottom: 12px; }
  .company { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; color: #1f2d24; }
  .addr { font-size: 9px; color: #6b6b6b; margin-top: 3px; line-height: 1.5; }
  .doctitle {
    margin-top: 12px;
    background: ${accent};
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #1f2d24;
  }
  .meta { display: table; width: 100%; margin-top: 10px; }
  .meta div { display: table-cell; width: 25%; vertical-align: top; padding-right: 8px; }
  .meta .k {
    font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a8a8a;
  }
  .meta .v { font-size: 10px; font-weight: 600; color: #2b2b2b; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  thead th {
    background: ${accent};
    border: 0.5px solid #b9c4bb;
    padding: 6px 5px;
    font-size: 8.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: left;
    color: #1f2d24;
  }
  tbody td { border: 0.5px solid #d8ded9; padding: 5px; vertical-align: top; line-height: 1.45; }
  td.c { text-align: center; }
  td.r { text-align: right; white-space: nowrap; }
  .note { color: #7a7a7a; font-size: 8.5px; margin-top: 2px; }
  tr.group td {
    background: #1f2d24; color: #ffffff; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em; font-size: 9px;
  }
  tr.section td { background: ${accent}; font-weight: 700; font-size: 9.5px; }
  tr.room td { background: #f3f5f3; font-weight: 600; font-size: 9px; color: #45524a; }
  tr { page-break-inside: avoid; }

  .totals { width: 46%; margin-left: auto; margin-top: 14px; }
  .totals tr td { border: 0; padding: 3px 0; font-size: 10px; }
  .totals .lbl { color: #6b6b6b; }
  .totals .val { text-align: right; font-weight: 600; }
  .totals .grand td {
    border-top: 1.5px solid #1f2d24; padding-top: 6px; font-size: 12.5px; font-weight: 700;
    color: #1f2d24;
  }

  .sign { margin-top: 28px; page-break-inside: avoid; }
  .sign .line { border-top: 1px solid #9aa39c; width: 190px; margin-top: 40px; }
  .sign .for { font-size: 9.5px; font-weight: 600; color: #3d352e; }

  .sheet.terms { page-break-before: always; }
  .terms h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: #1f2d24; margin: 16px 0 6px;
  }
  .terms ol { margin: 0; padding-left: 16px; }
  .terms li { font-size: 9.5px; line-height: 1.6; margin-bottom: 3px; }
</style>
</head>
<body>
  <div class="letterhead">
    <div class="company">${esc(company)}</div>
    <div class="addr">${esc(quotation.title)}</div>
  </div>

  <div class="doctitle">${esc(
    measured ? 'Quotation for interior &amp; execution' : 'Commercial estimate',
  )}</div>

  <div class="meta">
    <div><div class="k">Quote no.</div><div class="v">${esc(docNo)}</div></div>
    <div><div class="k">Date</div><div class="v">${esc(quoteDate)}</div></div>
    <div><div class="k">Project</div><div class="v">${esc(project || '—')}</div></div>
    <div><div class="k">Client</div><div class="v">${esc(client || '—')}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:7%">S.No</th>
        <th style="width:45%">Description</th>
        <th style="width:10%">Unit</th>
        <th style="width:11%">Qty</th>
        <th style="width:13%">Rate</th>
        <th style="width:14%">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="6" class="c">No line items on this quotation.</td></tr>'}
    </tbody>
  </table>

  <table class="totals">
    <tr><td class="lbl">Sub total</td><td class="val">${inr(subtotal)}</td></tr>
    ${
      charges > 0
        ? `<tr><td class="lbl">${esc(
            quotation.chargesLabel || `Design &amp; handling (${quotation.chargesPercent}%)`,
          )}</td><td class="val">${inr(charges)}</td></tr>
           <tr><td class="lbl">Total before GST</td><td class="val">${inr(taxable)}</td></tr>`
        : ''
    }
    <tr><td class="lbl">GST (${esc(quotation.gstPercent)}%)</td><td class="val">${inr(
      gstAmount,
    )}</td></tr>
    ${
      quotation.discount
        ? `<tr><td class="lbl">Discount</td><td class="val">− ${inr(quotation.discount)}</td></tr>`
        : ''
    }
    <tr class="grand"><td>Grand total</td><td class="val">${inr(grand)}</td></tr>
  </table>

  <div class="sign">
    <div class="for">For ${esc(company)}</div>
    <div class="line"></div>
    <div class="addr">Authorised signatory</div>
  </div>

  ${termsHtml}
</body>
</html>`
}

/** Renders to a PDF and opens the share sheet. Returns false if sharing is off. */
export async function shareQuotationPdf(options: QuotePdfOptions): Promise<boolean> {
  const html = buildHtml(options)
  const { uri } = await Print.printToFileAsync({ html, base64: false })
  return sharePdf(uri, `${options.quotation.title || 'Quotation'}.pdf`)
}

/** Sends straight to a printer / AirPrint without going through the share sheet. */
export async function printQuotation(options: QuotePdfOptions): Promise<void> {
  await Print.printAsync({ html: buildHtml(options) })
}

export { buildHtml as buildQuoteHtml }
