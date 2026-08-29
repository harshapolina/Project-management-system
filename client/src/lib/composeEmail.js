/** Pre-filled bodies for the compose popup (same content as WhatsApp templates). */

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export function clientProjectEmailDraft(project) {
  const name = project?.clientName || 'there'
  return {
    title: 'Email client',
    to: project?.clientEmail || '',
    subject: `Update on ${project?.name || 'your project'}`,
    body: `Hi ${name},\n\nRegarding your project "${project?.name || ''}" —\n\n`,
  }
}

export function vendorHelloEmailDraft(vendor) {
  return {
    title: 'Email vendor',
    to: vendor?.email || '',
    subject: `Hello ${vendor?.contact || vendor?.name || ''}`,
    body: `Hello ${vendor?.contact || vendor?.name || ''},\n\n`,
  }
}

export function poEmailDraft(po) {
  const vendor = po?.vendor || {}
  const lines = (po.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0
    const rate = Number(it.rate) || 0
    const amount = Number(it.amount) || qty * rate
    return `${i + 1}. ${it.description || 'Item'} — ${qty} × ${inr(rate)} = ${inr(amount)}`
  })
  const projectName = po.projectId?.name ? ` (${po.projectId.name})` : ''
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

export function rfqEmailDraft(rfq, vendor) {
  const lines = (rfq?.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0
    return `${i + 1}. ${it.description || 'Item'} — ${qty} ${it.unit || 'nos'}`
  })
  const project = rfq?.projectId?.name ? ` for ${rfq.projectId.name}` : ''
  const closing = rfq?.closingDate
    ? `\nPlease send your quote by ${new Date(rfq.closingDate).toLocaleDateString('en-IN')}.`
    : ''
  const body = [
    `Hello ${vendor?.contact || vendor?.name || ''},`,
    '',
    `Request for quotation ${rfq?.rfqNumber || ''}${project}:`,
    '',
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
