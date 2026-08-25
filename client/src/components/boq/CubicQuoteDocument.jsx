import { Fragment, useMemo } from 'react'
import { formatInr } from '../../lib/format'

/* ─────────────────────────── line maths ─────────────────────────── */

/**
 * Quantity is driven by the measurements when all three are present. Kept at
 * full precision — rounding here drifts the sheet total away from the source
 * quotation (49.6875 sft × ₹1500 is not 49.688 × ₹1500). Display rounds, maths
 * does not.
 */
export function lineQty(it) {
  const no = Number(it.measureNo) || 0
  const w = Number(it.width) || 0
  const h = Number(it.height) || 0
  if (no && w && h) return no * w * h
  return Number(it.qty) || no || 0
}

function lineAmount(it) {
  return lineQty(it) * (Number(it.rate) || 0)
}

const UNIT_LABEL = {
  sft: 'Sq.fts',
  rft: 'Rfts',
  nos: "No's",
  ls: 'LS',
  load: 'Load',
  sqm: 'Sq.m',
  rmt: 'Rmt',
  sheet: 'Sheet',
}

function unitLabel(it) {
  return it.unitLabel || UNIT_LABEL[it.unit] || it.unit || 'Sq.fts'
}

const nf = (n) =>
  Number(n) ? Number(Number(n).toFixed(3)).toLocaleString('en-IN') : '—'

/* ─────────────────────────── pagination ───────────────────────────
 * Descriptions in these templates run from three words to a full paragraph, so
 * a fixed rows-per-page split leaves half-empty sheets. We cost each row in
 * text lines and fill each page to a height budget instead.
 */
/* Calibrated against the 281mm printable sheet: ~850px of usable body on page 1
 * once the letterhead and totals are placed, ~1000px on the pages after it. */
const CHARS_PER_LINE = 74
const FIRST_PAGE_BUDGET = 57
const PAGE_BUDGET = 77

function rowCost(text, min = 1) {
  const raw = String(text || '')
  const hard = raw.split('\n').length - 1
  return Math.max(min, Math.ceil(raw.length / CHARS_PER_LINE) + hard)
}

/**
 * Walks the items in source order, injecting group / section / room heading
 * blocks exactly where the original sheet had them, then packs into pages.
 */
function buildPages(rows) {
  const blocks = []
  let group = null
  let section = null
  let room = null

  rows.forEach((it, index) => {
    const g = it.group?.trim() || ''
    const s = it.section?.trim() || ''
    const r = it.room?.trim() || ''

    const generic = (v) => !v || v === 'General'

    if (g && !generic(g) && g !== group) {
      blocks.push({ kind: 'group', title: g, cost: 2 })
      group = g
      section = null
      room = null
    }
    if (s && !generic(s) && s !== section && s !== g) {
      blocks.push({
        kind: 'section',
        title: s,
        no: it.sectionNo || '',
        cost: rowCost(s, 1) + 1,
      })
      section = s
      room = null
    }
    if (r && !generic(r) && r !== room && r !== s && r !== g) {
      blocks.push({ kind: 'room', title: r, cost: rowCost(r, 1) + 1 })
      room = r
    }
    blocks.push({
      kind: 'item',
      item: it,
      index,
      cost: rowCost(it.description, 1) + 1,
    })
  })

  const pages = []
  let page = []
  let used = 0
  let budget = FIRST_PAGE_BUDGET

  for (const block of blocks) {
    // never strand a heading at the foot of a page
    const isHeading = block.kind !== 'item'
    if (used + block.cost > budget && page.length) {
      pages.push(page)
      page = []
      used = 0
      budget = PAGE_BUDGET
    }
    if (isHeading && used + block.cost > budget * 0.86 && page.length) {
      pages.push(page)
      page = []
      used = 0
      budget = PAGE_BUDGET
    }
    page.push(block)
    used += block.cost
  }
  if (page.length) pages.push(page)
  return pages.length ? pages : [[]]
}

/* ─────────────────────────── chrome ─────────────────────────── */

/* px here, not on each block — one margin the whole page lines up to */
const SHEET =
  'cubic-sheet relative mx-auto w-full max-w-[210mm] bg-white px-4 pt-4 text-[#1c1917] shadow-[0_20px_60px_-32px_rgba(28,25,23,0.5)] ring-1 ring-[#e6ded2] print:shadow-none print:ring-0 sm:px-5 sm:pt-5 pb-2'

function LogoSlot({ src, alt, fallback }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="max-h-[62px] max-w-full object-contain"
        crossOrigin="anonymous"
      />
    )
  }
  return (
    <span className="text-center text-[13px] font-bold uppercase leading-tight tracking-[0.06em] text-[#1c1917]">
      {fallback}
    </span>
  )
}

/**
 * Mirrors the banded header of the source workbooks: title band, then a
 * three-column block of our logo / client address / client logo, then a strip
 * carrying our address, the quote number and the date.
 */
function Letterhead({
  company,
  address,
  phone,
  doc,
  project,
  meta,
  quoteNo,
  quoteDate,
  docMeta = {},
  accent,
}) {
  const customer = docMeta.customerName || project?.clientName || ''
  const clientAddress =
    docMeta.clientAddress || project?.location || project?.address || '—'

  return (
    <header className="border-2 border-[#1c1917]">
      <div className="border-b-2 border-[#1c1917] py-1.5 text-center" style={{ background: accent }}>
        <h1 className="text-[11px] font-bold text-[#1c1917] sm:text-[13px]">{doc}</h1>
      </div>

      <div className="grid grid-cols-1 divide-y-2 divide-[#1c1917] sm:grid-cols-[1.5fr_1.25fr_0.9fr] sm:divide-x-2 sm:divide-y-0">
        <div className="flex min-h-[92px] items-center justify-center px-4 py-3">
          <LogoSlot
            src={docMeta.companyLogo}
            alt={company}
            fallback={company}
          />
        </div>

        <div className="flex min-h-[92px] flex-col items-center justify-center px-4 py-3 text-center">
          <p className="text-[11px] font-bold text-[#1c1917]">Client Address:</p>
          <p className="mt-1 text-[10.5px] font-bold leading-[1.45] text-[#1c1917]">
            {clientAddress}
          </p>
        </div>

        <div className="flex min-h-[92px] flex-col items-center justify-center gap-1.5 px-4 py-3 text-center">
          <p className="text-[11px] font-bold text-[#1c1917]">Client:</p>
          {/* the logo stands in for the name when one has been uploaded */}
          {docMeta.clientLogo ? (
            <LogoSlot src={docMeta.clientLogo} alt={customer || 'Client'} />
          ) : (
            <p className="text-[11px] font-bold leading-tight text-[#1c1917]">
              {customer || '—'}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 border-t-2 border-[#1c1917] divide-y-2 divide-[#1c1917] sm:grid-cols-[1.5fr_1.25fr_0.9fr] sm:divide-x-2 sm:divide-y-0">
        <p className="flex min-h-[42px] items-center justify-center px-4 py-2 text-center text-[9.5px] font-bold leading-[1.5] text-[#1c1917]">
          {address}
          {phone ? `, Phone ${phone}` : ''}
        </p>
        <p className="flex min-h-[42px] items-center justify-center px-4 py-2 text-center text-[10px] font-bold text-[#1c1917]">
          Q.No: {quoteNo}
        </p>
        <p className="flex min-h-[42px] items-center justify-center px-4 py-2 text-center text-[10px] font-bold text-[#1c1917]">
          Date: {quoteDate}
        </p>
      </div>

      {meta.hasMeasurements ? (
        <div className="grid grid-cols-1 border-t-2 border-[#1c1917] divide-y-2 divide-[#1c1917] sm:grid-cols-[1.5fr_1.25fr_0.9fr] sm:divide-x-2 sm:divide-y-0">
          {/* The project name fills whichever cell its detail is missing from,
              so it never prints twice. */}
          <p className="flex min-h-[34px] items-center justify-center px-4 py-2 text-center text-[9.5px] font-bold leading-[1.5] text-[#1c1917]">
            {docMeta.architect ? (
              <span>
                ARCHITECT: {docMeta.architect}
                {docMeta.emailId ? (
                  <>
                    <br />
                    EMAIL ID: {docMeta.emailId}
                  </>
                ) : null}
              </span>
            ) : (
              <span>PROJECT: {project?.name || '—'}</span>
            )}
          </p>
          <p className="flex min-h-[34px] items-center justify-center px-4 py-2 text-center text-[9.5px] font-bold leading-[1.5] text-[#1c1917]">
            {docMeta.contactNo
              ? `CONTACT NO: ${docMeta.contactNo}`
              : docMeta.architect
                ? `PROJECT: ${project?.name || '—'}`
                : ''}
          </p>
          <p className="flex min-h-[34px] items-center justify-center px-4 py-2 text-center text-[9.5px] font-bold text-[#1c1917]">
            PE: {meta.propertyType}
          </p>
        </div>
      ) : null}
    </header>
  )
}

function RunningHead({ meta, page, total, doc }) {
  return (
    <div className="flex items-center justify-between border-b border-[#d8cec0] py-2 text-[9px] uppercase tracking-[0.14em] text-[#8a7d70]">
      <span className="truncate font-semibold text-[#5c5148]">{doc}</span>
      <span className="shrink-0">
        {meta.propertyType} · Page {page} of {total}
      </span>
    </div>
  )
}

const WEBSITE = 'www.cubicassociates.com'

function PageFoot({ page, total, client }) {
  return (
    <div className="mt-auto grid grid-cols-3 items-center border-t border-[#e6ded2] py-2 text-[8.5px] tracking-[0.1em] text-[#a3988a]">
      <span className="truncate uppercase">{client || ''}</span>
      <span className="text-center font-semibold tracking-[0.06em] text-[#8a7d70]">
        {WEBSITE}
      </span>
      <span className="text-right uppercase tabular-nums">
        {page} / {total}
      </span>
    </div>
  )
}

/* ─────────────────────────── item table ─────────────────────────── */

function ItemTable({ blocks, measured }) {
  // the unit column folds into the quantity cell on phones (commercial only)
  const cols = measured ? 9 : 6
  return (
    <div className="overflow-x-auto py-3 print:overflow-visible">
    <table className="w-full border-collapse text-[9.5px] leading-snug">
      <thead>
        <tr className="bg-[#f4a58a] text-left text-[8.5px] font-bold uppercase tracking-[0.05em] text-[#1c1917]">
          <th className="w-9 border border-[#d8cec0] px-1.5 py-1.5 text-center">Sl.</th>
          <th className="border border-[#d8cec0] px-2 py-1.5">
            {measured ? 'Description of item' : 'Items / description / finishes'}
          </th>
          {measured ? (
            <th className="hidden w-[62px] border border-[#d8cec0] px-1.5 py-1.5 text-center sm:table-cell">
              Category
            </th>
          ) : null}
          {measured ? (
            <>
              <th className="hidden w-11 border border-[#d8cec0] px-1 py-1.5 text-center sm:table-cell">
                No
              </th>
              <th className="hidden w-11 border border-[#d8cec0] px-1 py-1.5 text-center sm:table-cell">
                Width
              </th>
              <th className="hidden w-11 border border-[#d8cec0] px-1 py-1.5 text-center sm:table-cell">
                Height
              </th>
            </>
          ) : (
            <th className="hidden w-14 border border-[#d8cec0] px-1.5 py-1.5 text-center sm:table-cell">
              Unit
            </th>
          )}
          <th className="w-14 border border-[#d8cec0] px-1 py-1.5 text-center">
            {measured ? 'Qty' : 'Quantity'}
          </th>
          <th className="w-[58px] border border-[#d8cec0] px-1 py-1.5 text-right">
            Rate
          </th>
          <th className="w-[76px] border border-[#d8cec0] px-1.5 py-1.5 text-right">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {blocks.map((b, i) => {
          if (b.kind === 'group') {
            return (
              <tr key={`g${i}`} className="break-inside-avoid bg-[#1c1917]">
                <td
                  colSpan={cols}
                  className="border border-[#1c1917] px-2 py-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#f4efe6]"
                >
                  {b.title}
                </td>
              </tr>
            )
          }
          if (b.kind === 'section') {
            return (
              <tr key={`s${i}`} className="break-inside-avoid bg-[#e8f0e4]">
                <td className="border border-[#d8cec0] px-1.5 py-1.5 text-[9px] font-bold tabular-nums text-[#3d352e]">
                  {b.no || ''}
                </td>
                <td
                  colSpan={cols - 1}
                  className="whitespace-pre-line border border-[#d8cec0] px-2 py-1.5 text-[9.5px] font-bold text-[#1c1917]"
                >
                  {b.title}
                </td>
              </tr>
            )
          }
          if (b.kind === 'room') {
            return (
              <tr key={`r${i}`} className="break-inside-avoid bg-[#faf6f0]">
                <td
                  colSpan={cols}
                  className="border border-[#d8cec0] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#7a6d60]"
                >
                  {b.title}
                </td>
              </tr>
            )
          }

          const it = b.item
          const qty = lineQty(it)
          const no = Number(it.measureNo) || 0
          const w = Number(it.width) || 0
          const h = Number(it.height) || 0
          return (
            <tr key={it._key || b.index} className="break-inside-avoid align-middle">
              <td className="border border-[#d8cec0] px-1.5 py-1.5 text-center text-[9px] tabular-nums text-[#8a7d70]">
                {it.slNo || ''}
              </td>
              <td className="whitespace-pre-line border border-[#d8cec0] px-2 py-1.5 align-top text-[#1c1917]">
                {it.description}
                {measured && (it.category || no || w || h) ? (
                  <span className="mt-0.5 block text-[8.5px] text-[#a3988a] sm:hidden">
                    {[
                      it.category,
                      no || w || h ? `${nf(no)} × ${nf(w)} × ${nf(h)}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                ) : null}
              </td>
              {measured ? (
                <td className="hidden border border-[#d8cec0] px-1.5 py-1.5 text-center text-[9px] text-[#5c5148] sm:table-cell">
                  {it.category || '—'}
                </td>
              ) : null}
              {measured ? (
                <>
                  <td className="hidden border border-[#d8cec0] px-1 py-1.5 text-center tabular-nums sm:table-cell">
                    {nf(no)}
                  </td>
                  <td className="hidden border border-[#d8cec0] px-1 py-1.5 text-center tabular-nums sm:table-cell">
                    {nf(w)}
                  </td>
                  <td className="hidden border border-[#d8cec0] px-1 py-1.5 text-center tabular-nums sm:table-cell">
                    {nf(h)}
                  </td>
                </>
              ) : (
                <td className="hidden border border-[#d8cec0] px-1.5 py-1.5 text-center text-[9px] text-[#5c5148] sm:table-cell">
                  {unitLabel(it)}
                </td>
              )}
              <td className="border border-[#d8cec0] px-1 py-1.5 text-center tabular-nums">
                {nf(qty)}
                {measured ? null : (
                  <span className="block text-[8.5px] text-[#a3988a] sm:hidden">
                    {unitLabel(it)}
                  </span>
                )}
              </td>
              <td className="border border-[#d8cec0] px-1 py-1.5 text-right tabular-nums">
                {Number(it.rate) ? formatInr(it.rate) : '—'}
              </td>
              <td className="border border-[#d8cec0] px-1.5 py-1.5 text-right font-semibold tabular-nums">
                {Number(lineAmount(it)) ? formatInr(lineAmount(it)) : '—'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}

/* ─────────────────────────── totals & annexures ─────────────────────────── */

function TotalsBlock({ subtotal, charges, chargesLabel, taxable, gst, gstAmount, discount, grand }) {
  const Row = ({ label, value, strong, rule }) => (
    <div
      className={[
        'flex items-center justify-between gap-6 px-3 py-1.5 text-[10px]',
        rule ? 'border-t border-[#1c1917]' : 'border-t border-[#e6ded2]',
        strong ? 'font-bold text-[#1c1917]' : 'text-[#3d352e]',
      ].join(' ')}
    >
      <span className={strong ? 'uppercase tracking-[0.06em]' : ''}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
  return (
    <div className="flex justify-end pb-4 pt-3">
      <div className="w-full max-w-[300px] border border-[#d8cec0] bg-[#faf6f0]">
        <Row label="Sub Total" value={formatInr(subtotal)} strong />
        {charges > 0 ? (
          <Row label={chargesLabel || 'Design & Handling charges'} value={formatInr(charges)} />
        ) : null}
        {charges > 0 ? (
          <Row label="Total before GST" value={formatInr(taxable)} strong />
        ) : null}
        {gstAmount > 0 ? (
          <Row label={`GST @ ${gst}%`} value={formatInr(gstAmount)} />
        ) : null}
        {Number(discount) > 0 ? (
          <Row label="Discount" value={`− ${formatInr(discount)}`} />
        ) : null}
        <Row label="Grand Total" value={formatInr(grand)} strong rule />
      </div>
    </div>
  )
}

function ListPage({ title, note, children }) {
  return (
    <section className="py-4">
      <h2 className="border-b-2 border-[#1c1917] pb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1c1917]">
        {title}
      </h2>
      {note ? <p className="mt-2 text-[9.5px] text-[#7a6d60]">{note}</p> : null}
      {children}
    </section>
  )
}

function ActualsTable({ items }) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
    <table className="mt-3 w-full border-collapse text-[9.5px]">
      <thead>
        <tr className="bg-[#f4a58a] text-left text-[8.5px] font-bold uppercase tracking-[0.05em] text-[#1c1917]">
          <th className="w-9 border border-[#d8cec0] px-1.5 py-1.5 text-center">Sl.</th>
          <th className="border border-[#d8cec0] px-2 py-1.5">Description of item</th>
          <th className="w-[62px] border border-[#d8cec0] px-1.5 py-1.5">Category</th>
          <th className="w-14 border border-[#d8cec0] px-1 py-1.5 text-center">Qty</th>
          <th className="w-[86px] border border-[#d8cec0] px-1.5 py-1.5 text-right">Rate</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} className="break-inside-avoid align-top">
            <td className="border border-[#d8cec0] px-1.5 py-1.5 tabular-nums text-[#8a7d70]">
              {it.slNo || i + 1}
            </td>
            <td className="whitespace-pre-line border border-[#d8cec0] px-2 py-1.5 text-[#1c1917]">
              {it.description}
              {it.note ? (
                <span className="mt-0.5 block whitespace-pre-line text-[8.5px] text-[#a3988a]">
                  {it.note}
                </span>
              ) : null}
            </td>
            <td className="border border-[#d8cec0] px-1.5 py-1.5 text-[9px] text-[#5c5148]">
              {it.category || '—'}
            </td>
            <td className="border border-[#d8cec0] px-1 py-1.5 text-right tabular-nums">
              {it.qty ? nf(it.qty) : '—'}
            </td>
            <td className="border border-[#d8cec0] px-1.5 py-1.5 text-right tabular-nums">
              {it.rateText || 'As per actuals'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

function Signature({ company }) {
  return (
    <div className="mt-8 flex items-end justify-between gap-6 pb-6">
      <p className="text-[9px] leading-relaxed text-[#a3988a]">
        Computer generated quotation.
        <br />
        Subject to final design sign-off.
      </p>
      <div className="text-right">
        <p className="text-[10px] font-semibold text-[#3d352e]">For {company}</p>
        <div className="mt-10 w-44 border-t border-[#1c1917] pt-1 text-[9.5px] text-[#5c5148]">
          Authorised Signatory
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── document ─────────────────────────── */

export function CubicQuoteDocument({
  title,
  project,
  tenant,
  boqType,
  items = [],
  template,
  gst = 18,
  chargesPercent = 0,
  chargesLabel = '',
  discount = 0,
  status = 'draft',
  quoteNo,
  docMeta = {},
}) {
  const measured = boqType !== 'commercial'
  const meta = template?.meta || {
    propertyType: measured ? 'Residential' : 'Commercial',
    documentTitle: title || 'QUOTATION FOR INTERIOR & EXECUTION',
  }

  const rows = useMemo(
    () => items.filter((it) => it.description?.trim() || lineAmount(it) > 0),
    [items],
  )
  const itemPages = useMemo(() => buildPages(rows), [rows])

  const subtotal = rows.reduce((s, it) => s + lineAmount(it), 0)
  const charges = (subtotal * (Number(chargesPercent) || 0)) / 100
  const taxable = subtotal + charges
  const gstAmount = (taxable * (Number(gst) || 0)) / 100
  const grand = Math.max(0, taxable + gstAmount - (Number(discount) || 0))

  const company = tenant?.name || 'CUBIC ASSOCIATES PVT. LTD.'
  const address =
    docMeta.companyAddress ||
    tenant?.address ||
    '#320, East Avenue, Fifth Floor, Ayyappa Society Main Rd, Madhapur, Hyderabad, Telangana 500081'
  const phone = docMeta.companyPhone || tenant?.phone || '+91 98851 35555'
  const quoteDate =
    docMeta.quoteDate ||
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  const docNo =
    docMeta.quoteNo || quoteNo || (status === 'draft' ? 'DRAFT' : status.toUpperCase())
  // residential sheets band in green, commercial estimates in the pink of the
  // source workbook
  const accent = measured ? '#e8f0e4' : '#e8b7cd'
  const header = { ...docMeta, companyLogo: docMeta.companyLogo || tenant?.logoUrl || '' }

  const customerName =
    header.customerName || project?.clientName || tenant?.name || ''

  const actuals = template?.actuals?.items?.length ? template.actuals : null
  const notQuoted = template?.notQuoted || []
  const terms = template?.terms || []
  const paymentTerms = template?.paymentTerms || []
  const hasAnnexure = !!actuals || notQuoted.length > 0
  const hasTerms = terms.length > 0 || paymentTerms.length > 0

  const totalPages = itemPages.length + (hasAnnexure ? 1 : 0) + (hasTerms ? 1 : 0)
  let pageNo = 0

  return (
    <div id="quote-print" className="cubic-quote space-y-5 print:space-y-0">
      {itemPages.map((blocks, i) => {
        pageNo += 1
        const isLast = i === itemPages.length - 1
        const n = pageNo
        return (
          <article key={`p${i}`} className={SHEET}>
            {i === 0 ? (
              <Letterhead
                company={company}
                address={address}
                phone={phone}
                doc={meta.documentTitle}
                project={project}
                meta={meta}
                quoteNo={docNo}
                quoteDate={quoteDate}
                docMeta={header}
                accent={accent}
              />
            ) : (
              <RunningHead meta={meta} page={n} total={totalPages} doc={meta.documentTitle} />
            )}

            <ItemTable blocks={blocks} measured={measured} />

            {isLast ? (
              <TotalsBlock
                subtotal={subtotal}
                charges={charges}
                chargesLabel={chargesLabel}
                taxable={taxable}
                gst={gst}
                gstAmount={gstAmount}
                discount={discount}
                grand={grand}
              />
            ) : null}

            <PageFoot page={n} total={totalPages} client={customerName} />
          </article>
        )
      })}

      {hasAnnexure
        ? (() => {
            pageNo += 1
            const n = pageNo
            return (
              <article key="annex" className={SHEET}>
                <RunningHead meta={meta} page={n} total={totalPages} doc={meta.documentTitle} />
                {actuals ? (
                  <ListPage
                    title={actuals.title}
                    note="Billed against actual consumption — rates below are indicative and invoiced as per the supplier bill."
                  >
                    <ActualsTable items={actuals.items} />
                  </ListPage>
                ) : null}
                {notQuoted.length ? (
                  <ListPage title="Items not quoted">
                    <ul className="mt-3 space-y-1.5">
                      {notQuoted.map((t, i) => (
                        <li
                          key={i}
                          className="flex gap-2 border-b border-[#f0e9df] pb-1.5 text-[10px] text-[#3d352e]"
                        >
                          <span className="shrink-0 tabular-nums text-[#a3988a]">
                            {i + 1}.
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </ListPage>
                ) : null}
                <PageFoot page={n} total={totalPages} client={customerName} />
              </article>
            )
          })()
        : null}

      {hasTerms
        ? (() => {
            pageNo += 1
            const n = pageNo
            return (
              <article key="terms" className={SHEET}>
                <RunningHead meta={meta} page={n} total={totalPages} doc={meta.documentTitle} />
                {terms.length ? (
                  <ListPage title="Terms & conditions">
                    <ol className="mt-3 space-y-1.5">
                      {terms.map((t, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[10px] leading-relaxed text-[#3d352e]"
                        >
                          <span className="shrink-0 tabular-nums font-semibold text-[#a3988a]">
                            {i + 1}.
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ol>
                  </ListPage>
                ) : null}
                {paymentTerms.length ? (
                  <ListPage title="Payment terms">
                    <ol className="mt-3 space-y-1.5">
                      {paymentTerms.map((t, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[10px] leading-relaxed text-[#3d352e]"
                        >
                          <span className="shrink-0 tabular-nums font-semibold text-[#a3988a]">
                            {i + 1}.
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ol>
                  </ListPage>
                ) : null}
                <Signature company={company} />
                <PageFoot page={n} total={totalPages} client={customerName} />
              </article>
            )
          })()
        : null}
    </div>
  )
}

export { lineAmount as quoteLineAmount }
