import { formatInr } from '../../lib/format'
import { amountInWords } from '../../lib/amountInWords'
import { assetUrl } from '../../lib/api'

const SHEET =
  'tax-invoice-sheet relative mx-auto w-full max-w-[210mm] bg-white text-[11px] leading-snug text-black print:shadow-none'

const cell = 'border border-black px-1.5 py-1 align-top'
const label = 'text-[10px] font-normal text-black'
const value = 'text-[10px] font-semibold'

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })
  } catch {
    return String(d)
  }
}

function PartyBlock({ title, party }) {
  return (
    <div className={cell}>
      <p className={`${label} font-bold`}>{title}</p>
      <p className={`${value} mt-1 uppercase`}>{party?.name || '—'}</p>
      <p className="mt-1 whitespace-pre-line text-[10px]">{party?.address || ''}</p>
      {party?.gstin ? (
        <p className="mt-1 text-[10px]">
          <span className="font-semibold">GSTIN/UIN :</span> {party.gstin}
        </p>
      ) : null}
      {party?.stateName ? (
        <p className="text-[10px]">
          <span className="font-semibold">State Name :</span> {party.stateName}
          {party.stateCode ? `, Code : ${party.stateCode}` : ''}
        </p>
      ) : null}
    </div>
  )
}

function MetaRow({ label: l, value: v }) {
  return (
    <div className="grid grid-cols-[1fr_1fr] border-b border-black last:border-b-0">
      <div className={`${cell} border-l-0 border-t-0 border-r border-black font-semibold`}>
        {l}
      </div>
      <div className={`${cell} border-0 font-semibold`}>{v || ''}</div>
    </div>
  )
}

/**
 * Formal Indian GST tax invoice — Tally-style layout with black borders.
 * Matches Cubic Associates sample: company block, metadata grid, line items,
 * CGST/SGST split, amount in words, bank details, signatory.
 */
export function TaxInvoiceDocument({ invoice, tenant, printedAt }) {
  if (!invoice) return null

  const items = invoice.items || []
  const taxable = Number(invoice.taxableAmount) || 0
  const cgst = Number(invoice.cgstAmount) || 0
  const sgst = Number(invoice.sgstAmount) || 0
  const igst = Number(invoice.igstAmount) || 0
  const grand = Number(invoice.grandTotal) || 0
  const isIgst = invoice.gstMode === 'igst'
  const gstRate = items[0]?.gstRate || (isIgst ? invoice.igstPercent : (Number(invoice.cgstPercent || 0) + Number(invoice.sgstPercent || 0)))

  const logo = assetUrl(invoice.companyLogo || tenant?.logoUrl || '')

  return (
    <article id="tax-invoice-print" className={SHEET}>
      <p className="py-1 text-center text-[13px] font-bold tracking-wide">
        TAX INVOICE
      </p>
      {printedAt ? (
        <p className="mb-1 text-right text-[9px] text-neutral-600">
          Printed on {printedAt}
        </p>
      ) : null}

      <div className="border border-black">
        {/* Top: company + metadata */}
        <div className="grid grid-cols-1 border-b border-black sm:grid-cols-2">
          <div className={`${cell} border-l-0 border-t-0 border-r border-black`}>
            {logo ? (
              <img
                src={logo}
                alt=""
                className="mb-2 max-h-12 object-contain"
                crossOrigin="anonymous"
              />
            ) : null}
            <p className="text-[12px] font-bold uppercase">
              {invoice.companyName || tenant?.name || 'Company'}
            </p>
            <p className="mt-1 whitespace-pre-line text-[10px]">
              {invoice.companyAddress || ''}
            </p>
            {invoice.companyGstin ? (
              <p className="mt-1 text-[10px]">
                <span className="font-semibold">GSTIN/UIN :</span>{' '}
                {invoice.companyGstin}
              </p>
            ) : null}
            {invoice.companyStateName ? (
              <p className="text-[10px]">
                <span className="font-semibold">State Name :</span>{' '}
                {invoice.companyStateName}
                {invoice.companyStateCode
                  ? `, Code : ${invoice.companyStateCode}`
                  : ''}
              </p>
            ) : null}
            <p className="mt-1 text-[10px]">
              {[
                invoice.companyPhone && `Phone : ${invoice.companyPhone}`,
                invoice.companyEmail && `E-Mail : ${invoice.companyEmail}`,
                invoice.companyWebsite,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>

          <div className="border-0">
            <MetaRow label="Invoice No." value={invoice.invoiceNumber} />
            <MetaRow label="Dated" value={fmtDate(invoice.invoiceDate)} />
            <MetaRow label="Delivery Note" value={invoice.deliveryNote} />
            <MetaRow label="Mode/Terms of Payment" value={invoice.modeOfPayment} />
            <MetaRow
              label="Buyer's Order No."
              value={invoice.buyersOrderNo}
            />
            <MetaRow
              label="Dated"
              value={invoice.buyersOrderDate}
            />
            <MetaRow label="Dispatch Doc No." value={invoice.dispatchDocNo} />
            <MetaRow
              label="Delivery Note Date"
              value=""
            />
            <MetaRow label="Dispatched through" value={invoice.dispatchedThrough} />
            <MetaRow label="Destination" value={invoice.destination} />
            <MetaRow label="Terms of Delivery" value="" />
          </div>
        </div>

        {/* Consignee + Buyer */}
        <div className="grid grid-cols-1 border-b border-black sm:grid-cols-2">
          <PartyBlock title="Consignee (Ship to)" party={invoice.consignee} />
          <PartyBlock title="Buyer (Bill to)" party={invoice.buyer} />
        </div>

        {/* Line items */}
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-white font-bold">
              <th className={`${cell} w-8 text-center`}>Sl No.</th>
              <th className={`${cell} text-left`}>Description of Services</th>
              <th className={`${cell} w-16 text-center`}>HSN/SAC</th>
              <th className={`${cell} w-14 text-center`}>GST Rate</th>
              <th className={`${cell} w-16 text-right`}>Quantity</th>
              <th className={`${cell} w-20 text-right`}>Rate</th>
              <th className={`${cell} w-10 text-center`}>per</th>
              <th className={`${cell} w-24 text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it._id || i}>
                <td className={`${cell} text-center tabular-nums`}>{i + 1}</td>
                <td className={`${cell} whitespace-pre-line`}>
                  {it.description || '—'}
                </td>
                <td className={`${cell} text-center`}>{it.hsnSac || '—'}</td>
                <td className={`${cell} text-center tabular-nums`}>
                  {it.gstRate || gstRate}%
                </td>
                <td className={`${cell} text-right tabular-nums`}>
                  {Number(it.qty || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {it.unit || ''}
                </td>
                <td className={`${cell} text-right tabular-nums`}>
                  {Number(it.rate || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className={`${cell} text-center`}>{it.unit || 'LS'}</td>
                <td className={`${cell} text-right tabular-nums font-semibold`}>
                  {Number(it.amount || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}

            {/* Tax rows */}
            {!isIgst && cgst > 0 ? (
              <tr>
                <td colSpan={7} className={`${cell} text-right font-semibold`}>
                  Output CGST@{invoice.cgstPercent || 9}%
                </td>
                <td className={`${cell} text-right tabular-nums font-semibold`}>
                  {cgst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ) : null}
            {!isIgst && sgst > 0 ? (
              <tr>
                <td colSpan={7} className={`${cell} text-right font-semibold`}>
                  Output SGST@{invoice.sgstPercent || 9}%
                </td>
                <td className={`${cell} text-right tabular-nums font-semibold`}>
                  {sgst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ) : null}
            {isIgst && igst > 0 ? (
              <tr>
                <td colSpan={7} className={`${cell} text-right font-semibold`}>
                  Output IGST@{invoice.igstPercent || 18}%
                </td>
                <td className={`${cell} text-right tabular-nums font-semibold`}>
                  {igst.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ) : null}

            <tr className="font-bold">
              <td colSpan={4} className={cell} />
              <td className={`${cell} text-right`}>Total</td>
              <td colSpan={2} className={cell} />
              <td className={`${cell} text-right tabular-nums`}>
                ₹ {grand.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in words + bank + signature */}
        <div className="grid grid-cols-1 border-t border-black sm:grid-cols-2">
          <div className={`${cell} border-l-0 border-b-0 border-r border-black`}>
            <p className="text-[10px]">
              <span className="font-semibold">Amount Chargeable (in words)</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold italic">
              {amountInWords(grand)}
            </p>
            <p className="mt-2 text-[9px]">E. &amp; O.E</p>

            <p className="mt-4 text-[10px] font-semibold">Declaration</p>
            <p className="mt-1 text-[9px] leading-relaxed">
              {invoice.declaration ||
                'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.'}
            </p>

            <div className="mt-6">
              <p className="text-[10px] font-semibold">Company&apos;s Bank Details</p>
              <table className="mt-1 w-full text-[9px]">
                <tbody>
                  <tr>
                    <td className="py-0.5 font-semibold">A/c Holder&apos;s Name</td>
                    <td>{invoice.bank?.accountName || invoice.companyName}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Bank Name</td>
                    <td>{invoice.bank?.bankName || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">A/c No.</td>
                    <td>{invoice.bank?.accountNo || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Branch &amp; IFS Code</td>
                    <td>
                      {[invoice.bank?.branch, invoice.bank?.ifsc]
                        .filter(Boolean)
                        .join(' & ')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${cell} flex flex-col border-0`}>
            <p className="text-[10px] font-semibold">Company&apos;s PAN :</p>
            <div className="mt-auto pt-16 text-right">
              <p className="text-[10px] font-bold uppercase">
                for {invoice.companyName || tenant?.name}
              </p>
              {invoice.signatoryName ? (
                <p className="mt-8 text-[10px] font-semibold">
                  {invoice.signatoryName}
                </p>
              ) : (
                <div className="mt-10 h-8" />
              )}
              <p className="mt-1 text-[10px]">
                {invoice.signatoryTitle || 'Authorised Signatory'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] font-semibold uppercase">
        {invoice.jurisdiction || 'SUBJECT TO HYDERABAD JURISDICTION'}
      </p>
      <p className="mt-1 text-center text-[9px] text-neutral-600">
        This is a Computer Generated Invoice
      </p>
    </article>
  )
}
