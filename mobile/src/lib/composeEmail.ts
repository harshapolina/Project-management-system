import type { PurchaseOrder, Rfq, Vendor } from '../types/ops'
import type { Project } from '../types/models'

/**
 * Pre-filled email bodies, ported 1:1 from client/src/lib/composeEmail.js so a
 * vendor gets the same wording whether it was sent from the office or a phone.
 */

export interface EmailDraft {
  title: string
  to: string
  subject: string
  body: string
}

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`

function vendorOf(ref: Vendor | string | undefined): Partial<Vendor> {
  return ref && typeof ref === 'object' ? ref : {}
}

/**
 * `clientEmail` is not on the Project model today, so `to` normally starts
 * empty and the sender fills it in — same as the web draft.
 */
export function clientProjectEmailDraft(
  project?: (Partial<Project> & { clientEmail?: string }) | null,
): EmailDraft {
  const name = project?.clientName || 'there'
  return {
    title: 'Email client',
    to: project?.clientEmail || '',
    subject: `Update on ${project?.name || 'your project'}`,
    body: `Hi ${name},\n\nRegarding your project "${project?.name || ''}" —\n\n`,
  }
}

export function vendorHelloEmailDraft(vendor?: Partial<Vendor> | null): EmailDraft {
  const who = vendor?.contact || vendor?.name || ''
  return {
    title: 'Email vendor',
    to: vendor?.email || '',
    subject: `Hello ${who}`,
    body: `Hello ${who},\n\n`,
  }
}

export function poEmailDraft(po: PurchaseOrder): EmailDraft {
  const vendor = vendorOf(po.vendor)
  const lines = (po.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0
    const rate = Number(it.rate) || 0
    const amount = Number(it.amount) || qty * rate
    return `${i + 1}. ${it.description || 'Item'} — ${qty} × ${inr(rate)} = ${inr(amount)}`
  })
  const projectName =
    typeof po.projectId === 'object' && po.projectId?.name ? ` (${po.projectId.name})` : ''
  const body = [
    `Hello ${vendor.contact || vendor.name || ''},`,
    '',
    `Please arrange the following order ${po.poNumber || ''}${projectName}:`,
    '',
    ...(lines.length ? lines : ['(order details attached separately)']),
    '',
    `Order total: ${inr(po.value)}`,
    '',
    'Kindly confirm availability and expected delivery date. Thank you!',
  ].join('\n')

  return {
    title: 'Email purchase order',
    to: vendor.email || '',
    subject: `Purchase order ${po.poNumber || ''}`.trim(),
    body,
  }
}

export function rfqEmailDraft(rfq: Rfq, vendor?: Partial<Vendor> | null): EmailDraft {
  const lines = (rfq?.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0
    return `${i + 1}. ${it.description || 'Item'} — Qty ${qty} ${it.unit || 'nos'}`
  })
  const project =
    typeof rfq.projectId === 'object' && rfq.projectId?.name ? ` for ${rfq.projectId.name}` : ''
  const closing = rfq?.closingDate
    ? `\nPlease send your quote by ${new Date(rfq.closingDate).toLocaleDateString('en-IN')}.`
    : ''
  const body = [
    `Hello ${vendor?.contact || vendor?.name || ''},`,
    '',
    `Request for quotation ${rfq?.rfqNumber || ''}${project}:`,
    '',
    'Materials (please quote your rate — our BOQ rates are not shared):',
    ...(lines.length ? lines : ['(item list attached separately)']),
    '',
    'Kindly quote your best rate per unit, including GST, freight, loading and installation where applicable.',
    rfq?.notes ? `\nNotes: ${rfq.notes}` : '',
    closing,
    '',
    'Thank you!',
  ]
    .filter((l) => l !== '')
    .join('\n')

  return {
    title: 'Email RFQ',
    to: vendor?.email || '',
    subject: `RFQ ${rfq?.rfqNumber || ''}`.trim(),
    body,
  }
}
