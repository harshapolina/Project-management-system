import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

/**
 * Residential / commercial interior quotation templates, extracted from the two
 * Cubic source workbooks in ./source. Regenerate with:
 *   node server/scripts/extractQuotationCatalog.mjs
 */
const RAW = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'quotationCatalog.raw.json'), 'utf8'),
)

const TYPES = ['residential', 'commercial']

export function isInteriorBoqType(boqType) {
  return TYPES.includes(boqType)
}

function toItem(row, index) {
  const qty = Number(row.qty) || 0
  const rate = Number(row.rate) || 0
  return {
    /** Source ordering + hierarchy, so the quotation can redraw the original headings */
    sortIndex: index,
    slNo: row.slNo || '',
    group: row.group || '',
    section: row.section || '',
    sectionNo: row.sectionNo || '',
    room: row.room || 'General',
    description: row.description || '',
    category: row.category || '',
    measureNo: Number(row.no) || 0,
    width: Number(row.width) || 0,
    height: Number(row.height) || 0,
    qty,
    rate,
    amount: Number(row.amount) || qty * rate,
    unit: row.unit || 'sft',
    unitLabel: row.unitLabel || '',
    note: row.note || '',
    image: '',
    materialFamily: '',
    materialName: '',
    grade: '',
    thickness: '',
    brand: '',
    dimensions: '',
  }
}

/** Editable BOQ lines for a property type. */
export function interiorCatalogItems(boqType = 'residential') {
  const block = RAW[boqType] || RAW.residential
  return block.items.map(toItem)
}

/**
 * Everything around the line items that the quotation document has to print:
 * column set, handling charges, as-per-actuals / not-quoted lists and terms.
 */
export function interiorCatalogTemplate(boqType = 'residential') {
  const block = RAW[boqType] || RAW.residential
  return {
    meta: block.meta,
    charges: block.charges || [],
    actuals: block.actuals || null,
    notQuoted: block.notQuoted || [],
    terms: block.terms || [],
    paymentTerms: block.paymentTerms || [],
  }
}

export const INTERIOR_BOQ_META = {
  residential: {
    label: 'Residential',
    documentTitle: RAW.residential.meta.documentTitle,
    peLabel: 'Residential',
    hasMeasurements: true,
    itemCount: RAW.residential.items.length,
  },
  commercial: {
    label: 'Commercial',
    documentTitle: RAW.commercial.meta.documentTitle,
    peLabel: 'Commercial',
    hasMeasurements: false,
    itemCount: RAW.commercial.items.length,
  },
}
