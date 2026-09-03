import { formatInr } from '../constants/theme'
import type { PurchaseOrder } from '../types/ops'

export function digitsOnly(phone?: string) {
  return String(phone || '').replace(/\D/g, '')
}

export function telLink(phone?: string) {
  const digits = digitsOnly(phone)
  return digits ? `tel:${digits}` : ''
}

export function whatsappLink(phone?: string, message = '') {
  const digits = digitsOnly(phone)
  if (!digits) return ''
  const params = new URLSearchParams()
  params.set('phone', digits)
  if (message) params.set('text', message)
  return `https://web.whatsapp.com/send?${params.toString()}`
}

export function poWhatsappLink(po: PurchaseOrder) {
  const vendor = typeof po.vendor === 'object' ? po.vendor : null
  if (!vendor?.phone) return ''
  const lines = (po.items || []).map((it, i) => {
    const qty = Number(it.qty) || 0
    const rate = Number(it.rate) || 0
    const amount = Number(it.amount) || qty * rate
    return `${i + 1}. ${it.description || 'Item'} — ${qty} × ${formatInr(rate)} = ${formatInr(amount)}`
  })
  const projectName = typeof po.projectId === 'object' && po.projectId?.name ? ` (${po.projectId.name})` : ''
  const message = [
    `Hello ${vendor.contact || vendor.name},`,
    '',
    `Please arrange the following order ${po.poNumber || ''}${projectName}:`,
    '',
    ...(lines.length ? lines : ['(order details attached separately)']),
    '',
    `Order total: ${formatInr(po.value)}`,
    '',
    'Kindly confirm availability and expected delivery date. Thank you!',
  ].join('\n')
  return whatsappLink(vendor.phone, message)
}
