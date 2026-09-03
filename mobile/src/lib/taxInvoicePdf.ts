import * as Print from 'expo-print'
import { sharePdf } from './exportFile'
import { amountInWords } from './amountInWords'
import { assetUrl } from '../constants/env'
import type { TaxInvoice, TaxInvoiceParty } from '../types/taxInvoice'
import type { Tenant } from '../types/models'

/**
 * Formal Indian GST tax invoice — the mobile counterpart of the web client's
 * TaxInvoiceDocument. Same Tally-style black-bordered layout, so an invoice
 * printed from a phone is the document the office already recognises.
 */

function esc(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(n?: number): string {
  return (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function qtyText(n?: number): string {
  return (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function fmtDate(d?: string): string {
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

function partyBlock(title: string, party?: TaxInvoiceParty): string {
  return `
    <td class="cell party">
      <p class="lbl bold">${esc(title)}</p>
      <p class="val upper">${esc(party?.name) || '—'}</p>
      <p class="addr">${esc(party?.address)}</p>
      ${party?.gstin ? `<p class="tiny"><b>GSTIN/UIN :</b> ${esc(party.gstin)}</p>` : ''}
      ${
        party?.stateName
          ? `<p class="tiny"><b>State Name :</b> ${esc(party.stateName)}${
              party.stateCode ? `, Code : ${esc(party.stateCode)}` : ''
            }</p>`
          : ''
      }
    </td>`
}

function metaRow(label: string, value?: string): string {
  return `<tr><td class="cell meta-l">${esc(label)}</td><td class="cell meta-v">${esc(value)}</td></tr>`
}

export interface TaxInvoicePdfOptions {
  invoice: TaxInvoice
  tenant?: Tenant | null
  printedAt?: string
}

export function buildTaxInvoiceHtml({ invoice, tenant, printedAt }: TaxInvoicePdfOptions): string {
  const items = invoice.items || []
  const cgst = Number(invoice.cgstAmount) || 0
  const sgst = Number(invoice.sgstAmount) || 0
  const igst = Number(invoice.igstAmount) || 0
  const grand = Number(invoice.grandTotal) || 0
  const isIgst = invoice.gstMode === 'igst'
  const fallbackRate = isIgst
    ? invoice.igstPercent
    : (Number(invoice.cgstPercent) || 0) + (Number(invoice.sgstPercent) || 0)
  const gstRate = items[0]?.gstRate || fallbackRate

  const logo = assetUrl(invoice.companyLogo || tenant?.logoUrl || '')
  const companyName = invoice.companyName || tenant?.name || 'Company'

  const contact = [
    invoice.companyPhone && `Phone : ${invoice.companyPhone}`,
    invoice.companyEmail && `E-Mail : ${invoice.companyEmail}`,
    invoice.companyWebsite,
  ]
    .filter(Boolean)
    .join(', ')

  const itemRows = items
    .map(
      (it, i) => `
      <tr>
        <td class="cell c num">${i + 1}</td>
        <td class="cell desc">${esc(it.description) || '—'}</td>
        <td class="cell c">${esc(it.hsnSac) || '—'}</td>
        <td class="cell c num">${esc(it.gstRate || gstRate)}%</td>
        <td class="cell r num">${qtyText(it.qty)} ${esc(it.unit)}</td>
        <td class="cell r num">${money(it.rate)}</td>
        <td class="cell c">${esc(it.unit) || 'LS'}</td>
        <td class="cell r num bold">${money(it.amount)}</td>
      </tr>`,
    )
    .join('')

  const taxRow = (label: string, amount: number) => `
      <tr>
        <td class="cell r bold" colspan="7">${esc(label)}</td>
        <td class="cell r num bold">${money(amount)}</td>
      </tr>`

  const taxRows = [
    !isIgst && cgst > 0 ? taxRow(`Output CGST@${invoice.cgstPercent || 9}%`, cgst) : '',
    !isIgst && sgst > 0 ? taxRow(`Output SGST@${invoice.sgstPercent || 9}%`, sgst) : '',
    isIgst && igst > 0 ? taxRow(`Output IGST@${invoice.igstPercent || 18}%`, igst) : '',
  ].join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }
  .sheet { width: 100%; }
  .head { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: .04em; padding: 4px 0; }
  .printed { text-align: right; font-size: 9px; color: #555; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  .frame { border: 1px solid #000; }
  .cell { border: 1px solid #000; padding: 4px 6px; vertical-align: top; font-size: 10px; }
  .lbl { font-size: 10px; margin: 0; }
  .val { font-size: 10px; font-weight: 700; margin: 4px 0 0; }
  .addr { font-size: 10px; margin: 4px 0 0; white-space: pre-line; }
  .tiny { font-size: 10px; margin: 2px 0 0; }
  .bold { font-weight: 700; }
  .upper { text-transform: uppercase; }
  .c { text-align: center; }
  .r { text-align: right; }
  .num { font-variant-numeric: tabular-nums; }
  .logo { max-height: 44px; margin-bottom: 8px; }
  .company { font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0; }
  .meta-l { font-weight: 700; width: 50%; }
  .meta-v { font-weight: 700; }
  .party { width: 50%; }
  .desc { white-space: pre-line; }
  .foot-l { width: 50%; }
  .bank td { padding: 1px 0; font-size: 9px; }
  .bank .k { font-weight: 700; padding-right: 8px; white-space: nowrap; }
  .sign { text-align: right; padding-top: 56px; }
  .juris { text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 8px; }
  .gen { text-align: center; font-size: 9px; color: #555; margin-top: 4px; }
</style>
</head>
<body>
<div class="sheet">
  <p class="head">TAX INVOICE</p>
  ${printedAt ? `<p class="printed">Printed on ${esc(printedAt)}</p>` : ''}

  <table class="frame">
    <tr>
      <td class="cell" style="width:50%">
        ${logo ? `<img class="logo" src="${esc(logo)}" />` : ''}
        <p class="company">${esc(companyName)}</p>
        <p class="addr">${esc(invoice.companyAddress)}</p>
        ${invoice.companyGstin ? `<p class="tiny"><b>GSTIN/UIN :</b> ${esc(invoice.companyGstin)}</p>` : ''}
        ${
          invoice.companyStateName
            ? `<p class="tiny"><b>State Name :</b> ${esc(invoice.companyStateName)}${
                invoice.companyStateCode ? `, Code : ${esc(invoice.companyStateCode)}` : ''
              }</p>`
            : ''
        }
        ${contact ? `<p class="tiny">${esc(contact)}</p>` : ''}
      </td>
      <td class="cell" style="padding:0">
        <table>
          ${metaRow('Invoice No.', invoice.invoiceNumber)}
          ${metaRow('Dated', fmtDate(invoice.invoiceDate))}
          ${metaRow('Delivery Note', invoice.deliveryNote)}
          ${metaRow('Mode/Terms of Payment', invoice.modeOfPayment)}
          ${metaRow("Buyer's Order No.", invoice.buyersOrderNo)}
          ${metaRow('Dated', invoice.buyersOrderDate)}
          ${metaRow('Dispatch Doc No.', invoice.dispatchDocNo)}
          ${metaRow('Delivery Note Date', '')}
          ${metaRow('Dispatched through', invoice.dispatchedThrough)}
          ${metaRow('Destination', invoice.destination)}
          ${metaRow('Terms of Delivery', '')}
        </table>
      </td>
    </tr>
    <tr>
      ${partyBlock('Consignee (Ship to)', invoice.consignee)}
      ${partyBlock('Buyer (Bill to)', invoice.buyer)}
    </tr>
  </table>

  <table class="frame" style="border-top:0">
    <thead>
      <tr class="bold">
        <th class="cell c" style="width:30px">Sl No.</th>
        <th class="cell" style="text-align:left">Description of Services</th>
        <th class="cell c" style="width:56px">HSN/SAC</th>
        <th class="cell c" style="width:48px">GST Rate</th>
        <th class="cell r" style="width:64px">Quantity</th>
        <th class="cell r" style="width:70px">Rate</th>
        <th class="cell c" style="width:36px">per</th>
        <th class="cell r" style="width:84px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${taxRows}
      <tr class="bold">
        <td class="cell" colspan="4"></td>
        <td class="cell r">Total</td>
        <td class="cell" colspan="2"></td>
        <td class="cell r num">₹ ${money(grand)}</td>
      </tr>
    </tbody>
  </table>

  <table class="frame" style="border-top:0">
    <tr>
      <td class="cell foot-l">
        <p class="tiny"><b>Amount Chargeable (in words)</b></p>
        <p class="val" style="font-style:italic">${esc(amountInWords(grand))}</p>
        <p class="tiny" style="margin-top:8px">E. &amp; O.E</p>

        <p class="tiny bold" style="margin-top:16px">Declaration</p>
        <p class="tiny">${esc(
          invoice.declaration ||
            'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
        )}</p>

        <p class="tiny bold" style="margin-top:20px">Company&#39;s Bank Details</p>
        <table class="bank">
          <tr><td class="k">A/c Holder&#39;s Name</td><td>${esc(
            invoice.bank?.accountName || companyName,
          )}</td></tr>
          <tr><td class="k">Bank Name</td><td>${esc(invoice.bank?.bankName) || '—'}</td></tr>
          <tr><td class="k">A/c No.</td><td>${esc(invoice.bank?.accountNo) || '—'}</td></tr>
          <tr><td class="k">Branch &amp; IFS Code</td><td>${esc(
            [invoice.bank?.branch, invoice.bank?.ifsc].filter(Boolean).join(' & '),
          )}</td></tr>
        </table>
      </td>
      <td class="cell">
        <p class="tiny bold">Company&#39;s PAN :</p>
        <div class="sign">
          <p class="tiny bold upper">for ${esc(companyName)}</p>
          ${
            invoice.signatoryName
              ? `<p class="tiny bold" style="margin-top:32px">${esc(invoice.signatoryName)}</p>`
              : '<div style="height:40px"></div>'
          }
          <p class="tiny">${esc(invoice.signatoryTitle || 'Authorised Signatory')}</p>
        </div>
      </td>
    </tr>
  </table>

  <p class="juris">${esc(invoice.jurisdiction || 'SUBJECT TO HYDERABAD JURISDICTION')}</p>
  <p class="gen">This is a Computer Generated Invoice</p>
</div>
</body>
</html>`
}

export async function shareTaxInvoicePdf(options: TaxInvoicePdfOptions): Promise<boolean> {
  const html = buildTaxInvoiceHtml(options)
  const { uri } = await Print.printToFileAsync({ html, base64: false })
  return sharePdf(uri, `Invoice ${options.invoice.invoiceNumber}`)
}

export async function printTaxInvoice(options: TaxInvoicePdfOptions): Promise<void> {
  await Print.printAsync({ html: buildTaxInvoiceHtml(options) })
}
