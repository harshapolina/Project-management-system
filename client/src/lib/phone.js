/** Country calling codes offered when capturing a client phone number. */
export const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+971', country: 'UAE' },
  { code: '+1', country: 'USA / Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+65', country: 'Singapore' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+974', country: 'Qatar' },
  { code: '+968', country: 'Oman' },
  { code: '+965', country: 'Kuwait' },
  { code: '+973', country: 'Bahrain' },
  { code: '+977', country: 'Nepal' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+880', country: 'Bangladesh' },
]

/** Combine a country code and local number into one stored string, e.g. "+91 9876543210". */
export function buildPhone(code, number) {
  const digits = String(number || '').replace(/\D/g, '')
  return digits ? `${code} ${digits}` : ''
}

/** Split a stored phone back into { code, number } for editing forms. */
export function splitPhone(phone) {
  const raw = String(phone || '').trim()
  const match = COUNTRY_CODES.map((c) => c.code)
    .sort((a, b) => b.length - a.length)
    .find((code) => raw.startsWith(code))
  if (match) {
    return { code: match, number: raw.slice(match.length).replace(/\D/g, '') }
  }
  return { code: '+91', number: raw.replace(/\D/g, '') }
}

/** WhatsApp Web link for desktop browsers. Returns '' when no usable number. */
export function whatsappLink(phone, message = '') {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const params = new URLSearchParams()
  params.set('phone', digits)
  if (message) params.set('text', message)
  return `https://web.whatsapp.com/send?${params.toString()}`
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

/**
 * WhatsApp link that sends a purchase-order item list to its vendor.
 * Expects a PO with a populated vendor ({ name, contact, phone }).
 * Returns '' when the vendor has no phone number.
 */
export function poWhatsappLink(po) {
  const vendor = po?.vendor || {}
  if (!vendor.phone) return ''

  const lines = (po.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0
    const rate = Number(it.rate) || 0
    const amount = Number(it.amount) || qty * rate
    return `${i + 1}. ${it.description || 'Item'} — ${qty} × ${inr(rate)} = ${inr(amount)}`
  })

  const projectName = po.projectId?.name ? ` (${po.projectId.name})` : ''
  const message = [
    `Hello ${vendor.contact || vendor.name},`,
    '',
    `Please arrange the following order ${po.poNumber || ''}${projectName}:`,
    '',
    ...(lines.length ? lines : ['(order details attached separately)']),
    '',
    `Order total: ${inr(po.value)}`,
    '',
    'Kindly confirm availability and expected delivery date. Thank you!',
  ].join('\n')

  return whatsappLink(vendor.phone, message)
}

/**
 * WhatsApp link that asks a vendor to quote an RFQ. Sends the item list with
 * quantities but deliberately without our BOQ rates — the point of an RFQ is
 * to find out what the vendor charges, not to anchor them to our number.
 */
export function rfqWhatsappLink(rfq, vendor) {
  if (!vendor?.phone) return ''

  const lines = (rfq?.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0
    return `${i + 1}. ${it.description || 'Item'} — ${qty} ${it.unit || 'nos'}`
  })

  const project = rfq?.projectId?.name ? ` for ${rfq.projectId.name}` : ''
  const closing = rfq?.closingDate
    ? `\nPlease send your quote by ${new Date(rfq.closingDate).toLocaleDateString('en-IN')}.`
    : ''

  const message = [
    `Hello ${vendor.contact || vendor.name},`,
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

  return whatsappLink(vendor.phone, message)
}
