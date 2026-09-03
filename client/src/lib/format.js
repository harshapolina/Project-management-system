import { formatCurrency as fmt } from '../lib/utils'

export { fmt as formatCurrency }

export function formatInr(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

export function stageLabel(key) {
  const map = {
    design: 'Design',
    planning: 'Planning / BOQ',
    procurement: 'Procurement',
    execution: 'Execution',
    handover: 'QC / Handover',
    new_enquiry: 'New Enquiry',
    site_visit: 'Site Visit',
    quotation_sent: 'Quotation Sent',
    negotiation: 'Negotiation',
    mood_board: 'Mood Board',
    hot: 'Hot',
    dead: 'Dead',
    won: 'Hot',
    lost: 'Dead',
  }
  return map[key] || String(key || '').replace(/_/g, ' ')
}

export const COVER_FALLBACK =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80'
