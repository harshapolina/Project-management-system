import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const RAW = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'quotationCatalog.raw.json'), 'utf8'),
)

function mapUnit(raw) {
  const key = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
  if (['sqfts', 'sft', 'sqft', 'sqfeet'].includes(key)) return 'sft'
  if (key === 'rft') return 'rft'
  if (key === 'ls') return 'ls'
  if (['nos', 'no', 'nos'].includes(key)) return 'nos'
  if (key === 'load') return 'load'
  if (key === 'rmt' || key === 'rmtr') return 'rmt'
  if (key === 'sqm' || key === 'sqmtr') return 'sqm'
  return 'sft'
}

function toItem(row) {
  const qty = Number(row.qty) || 0
  const rate = Number(row.rate) || 0
  return {
    description: row.description || '',
    category: String(row.category || '').trim(),
    room: row.room || 'General',
    measureNo: Number(row.no) || 0,
    width: Number(row.width) || 0,
    height: Number(row.height) || 0,
    qty,
    rate,
    amount: qty * rate,
    unit: mapUnit(row.unitKey || row.unit),
    image: '',
    materialFamily: '',
    materialName: '',
    grade: '',
    thickness: '',
    brand: '',
    dimensions: '',
  }
}

export function interiorCatalogItems(boqType = 'residential') {
  const rows = boqType === 'commercial' ? RAW.commercial : RAW.residential
  return rows.map(toItem)
}

export const INTERIOR_BOQ_META = {
  residential: {
    label: 'Residential',
    documentTitle: 'QUOTATION FOR INTERIOR & EXECUTION',
    peLabel: 'Residential',
  },
  commercial: {
    label: 'Commercial',
    documentTitle: 'QUOTATION FOR INTERIOR & EXECUTION',
    peLabel: 'Commercial',
  },
}
