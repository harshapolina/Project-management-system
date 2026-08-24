import { Fragment } from 'react'
import { formatInr } from '../../lib/format'

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out.length ? out : [[]]
}

function lineQty(it) {
  const no = Number(it.measureNo) || 0
  const w = Number(it.width) || 0
  const h = Number(it.height) || 0
  if (no && w && h) return Math.round(no * w * h * 1000) / 1000
  return Number(it.qty) || no || 0
}

function lineAmount(it) {
  return lineQty(it) * (Number(it.rate) || 0)
}

function unitLabel(unit) {
  const map = {
    sft: 'Sq.ft',
    rft: 'Rft',
    nos: "No's",
    ls: 'LS',
    load: 'Load',
    sqm: 'Sq.m',
    rmt: 'Rmt',
    sheet: 'Sheet',
  }
  return map[unit] || unit || 'Sq.ft'
}

/**
 * Cubic-style multi-page quotation preview.
 */
export function CubicQuoteDocument({
  title,
  project,
  tenant,
  boqType,
  items = [],
  gst = 18,
  discount = 0,
  status = 'draft',
}) {
  const rows = items.filter(
    (it) => it.description?.trim() || lineAmount(it) > 0,
  )
  const pages = chunk(rows, 9)
  const subtotal = rows.reduce((s, it) => s + lineAmount(it), 0)
  const gstAmount = (subtotal * (Number(gst) || 0)) / 100
  const grand = Math.max(0, subtotal + gstAmount - (Number(discount) || 0))
  const pe = boqType === 'commercial' ? 'Commercial' : 'Residential'
  const company = tenant?.name || 'CUBIC ASSOCIATES PVT. LTD.'
  const quoteDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const quoteNo = status === 'draft' ? 'DRAFT' : status === 'approved' ? 'APPROVED' : status.toUpperCase()

  return (
    <div className="space-y-6">
      {pages.map((pageRows, pageIdx) => (
        <article
          key={pageIdx}
          className="mx-auto w-full max-w-[210mm] overflow-hidden bg-[#fbf8f4] text-[#1c1917] shadow-[0_18px_50px_-28px_rgba(28,25,23,0.45)] ring-1 ring-[#e7e0d6]"
        >
          {pageIdx === 0 ? (
            <header className="border-b border-[#e4d8c8] px-7 pb-4 pt-6">
              <div className="flex items-start justify-between gap-6">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#1c1917] text-[11px] font-bold tracking-[0.14em] text-[#f4efe6]">
                    CA
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold tracking-[0.04em] text-[#1c1917]">
                      {company}
                    </p>
                    <p className="mt-1 max-w-[280px] text-[10px] leading-relaxed text-[#6b6258]">
                      #320, East Avenue, Fifth Floor, Ayyappa Society Main Rd,
                      Madhapur, Hyderabad, Telangana 500081
                      <br />
                      Ph. +91 98851 35555
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a7d70]">
                    Property type
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#1c1917]">
                    PE: {pe}
                  </p>
                </div>
              </div>

              <h1 className="mt-5 text-center text-[13px] font-semibold tracking-[0.18em] text-[#1c1917]">
                {title || 'QUOTATION FOR INTERIOR & EXECUTION'}
              </h1>

              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-[#eadfce] pt-3 text-[11px]">
                <p>
                  <span className="font-semibold text-[#6b6258]">Customer: </span>
                  {project?.clientName || '—'}
                </p>
                <p>
                  <span className="font-semibold text-[#6b6258]">Quote no: </span>
                  {quoteNo}
                </p>
                <p className="col-span-2">
                  <span className="font-semibold text-[#6b6258]">Site: </span>
                  {project?.location || project?.name || '—'}
                </p>
                <p>
                  <span className="font-semibold text-[#6b6258]">Project: </span>
                  {project?.name || '—'}
                </p>
                <p>
                  <span className="font-semibold text-[#6b6258]">Date: </span>
                  {quoteDate}
                </p>
              </div>
            </header>
          ) : (
            <div className="flex items-center justify-between border-b border-[#eadfce] px-7 py-3 text-[10px] uppercase tracking-[0.12em] text-[#8a7d70]">
              <span>{company}</span>
              <span>
                Page {pageIdx + 1} of {pages.length}
              </span>
            </div>
          )}

          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#c47a62] text-left text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                <th className="w-10 px-2 py-2">Sl.</th>
                <th className="px-2 py-2">Description of item</th>
                <th className="w-[72px] px-2 py-2">Category</th>
                <th className="w-12 px-1 py-2 text-right">No</th>
                <th className="w-12 px-1 py-2 text-right">W</th>
                <th className="w-12 px-1 py-2 text-right">H</th>
                <th className="w-14 px-1 py-2 text-right">Qty</th>
                <th className="w-14 px-1 py-2">Unit</th>
                <th className="w-16 px-1 py-2 text-right">Rate</th>
                <th className="w-[88px] px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((it, i) => {
                const globalIdx = pageIdx * 9 + i
                const prev = globalIdx > 0 ? rows[globalIdx - 1] : null
                const showRoom = it.room && it.room !== prev?.room
                return (
                  <Fragment key={it._key || i}>
                    {showRoom ? (
                      <tr className="bg-[#efe6d8]">
                        <td
                          colSpan={10}
                          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5c5148]"
                        >
                          {it.room}
                        </td>
                      </tr>
                    ) : null}
                    <tr className="align-top border-b border-[#eadfce]">
                      <td className="px-2 py-2 tabular-nums text-[#8a7d70]">
                        {globalIdx + 1}
                      </td>
                      <td className="whitespace-pre-line px-2 py-2 leading-snug text-[#1c1917]">
                        {it.description}
                      </td>
                      <td className="px-2 py-2 text-[#5c5148]">
                        {it.category || '—'}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {Number(it.measureNo) || '—'}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {Number(it.width) || '—'}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {Number(it.height) || '—'}
                      </td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {lineQty(it)}
                      </td>
                      <td className="px-1 py-2">{unitLabel(it.unit)}</td>
                      <td className="px-1 py-2 text-right tabular-nums">
                        {formatInr(it.rate)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">
                        {formatInr(lineAmount(it))}
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          {pageIdx === pages.length - 1 ? (
            <footer className="flex justify-end border-t border-[#eadfce] px-7 py-5">
              <div className="w-[240px] space-y-1.5 text-[11px]">
                <div className="flex justify-between text-[#6b6258]">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatInr(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#6b6258]">
                  <span>GST ({gst || 0}%)</span>
                  <span className="tabular-nums">{formatInr(gstAmount)}</span>
                </div>
                {Number(discount) > 0 ? (
                  <div className="flex justify-between text-[#6b6258]">
                    <span>Discount</span>
                    <span className="tabular-nums">−{formatInr(discount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-[#1c1917] pt-2 text-[13px] font-semibold text-[#1c1917]">
                  <span>Grand total</span>
                  <span className="tabular-nums">{formatInr(grand)}</span>
                </div>
              </div>
            </footer>
          ) : (
            <p className="px-7 py-3 text-right text-[10px] text-[#8a7d70]">
              Continued…
            </p>
          )}
        </article>
      ))}
    </div>
  )
}

export { lineQty, lineAmount as quoteLineAmount }
