/**
 * Full plywood material master — matches
 * Full_Plywood_BWP_710_BWR_IS303_Material_Specificat template.
 * Commercial → BWP 710 Grade (308 rows)
 * Residential → BWR IS 303 (308 rows)
 */

const BRANDS = [
  'MRK',
  'Real Gurjan',
  'Sylvan',
  'Saburi',
  'Marine',
  'CenturyPly',
  'Greenply',
  'Kitply',
  'Archidply',
  'Duroply',
  'Sainik 710',
]

const THICKNESSES = ['4 mm', '6 mm', '9 mm', '12 mm', '16 mm', '18 mm', '19 mm', '25 mm']
const SIZES = ["8' × 4'", "7' × 4'", "8' × 3'", "7' × 3'"]

const GRADE_NOTE =
  'Note: Final grade, thickness and make to approved BOQ/specification'

const SECTIONS = [
  {
    boqType: 'commercial',
    section: 'INTERIOR / JOINERY',
    materialName: 'Plywood',
    grade: `BWP / Boiling Waterproof – 710 Grade\nApplication: Kitchen, toilet, wet-area furniture, commercial joinery\n${GRADE_NOTE}`,
  },
  {
    boqType: 'residential',
    section: 'INTERIOR / JOINERY',
    materialName: 'Plywood',
    grade: `BWR / Boiling Water Resistant – IS 303\nApplication: Interior furniture, wardrobes, dry-area joinery\n${GRADE_NOTE}`,
  },
]

function buildCatalog() {
  const items = []
  let sno = 1
  for (const section of SECTIONS) {
    for (const thickness of THICKNESSES) {
      for (const brand of BRANDS) {
        for (const dimensions of SIZES) {
          items.push({
            sno: sno++,
            boqType: section.boqType,
            section: section.section,
            materialFamily: 'Plywood',
            materialName: section.materialName,
            grade: section.grade,
            thickness,
            brand,
            dimensions,
            unit: 'Sheet',
            description: `Plywood · ${thickness} · ${brand} · ${dimensions}`,
          })
        }
      }
    }
  }
  return items
}

const CATALOG = buildCatalog()

export function listMaterialCatalog({ boqType, q, brand, thickness, page = 1, limit = 50 } = {}) {
  let rows = CATALOG
  if (boqType && boqType !== 'all') {
    rows = rows.filter((r) => r.boqType === boqType)
  }
  if (brand) {
    const b = brand.toLowerCase()
    rows = rows.filter((r) => r.brand.toLowerCase().includes(b))
  }
  if (thickness) {
    rows = rows.filter((r) => r.thickness === thickness)
  }
  if (q) {
    const term = q.toLowerCase()
    rows = rows.filter((r) =>
      [r.materialFamily, r.materialName, r.grade, r.thickness, r.brand, r.dimensions, r.description]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }

  const total = rows.length
  const start = (Math.max(1, page) - 1) * limit
  const items = rows.slice(start, start + limit)

  return {
    items,
    total,
    page: Math.max(1, page),
    limit,
    sections: SECTIONS,
    brands: BRANDS,
    thicknesses: THICKNESSES,
    sizes: SIZES,
  }
}

/** Turn catalog rows into BOQ line items (qty/rate left for user). */
export function catalogRowsToBoqItems(rows, room = 'INTERIOR / JOINERY') {
  return rows.map((row) => ({
    materialFamily: row.materialFamily,
    materialName: row.materialName,
    grade: row.grade,
    thickness: row.thickness,
    brand: row.brand,
    dimensions: row.dimensions,
    description: row.description,
    unit: 'sheet',
    qty: 0,
    rate: 0,
    amount: 0,
    room,
    image: '',
  }))
}

export function templateItemsForType(boqType, room = 'INTERIOR / JOINERY') {
  const { items } = listMaterialCatalog({ boqType, limit: 9999 })
  return catalogRowsToBoqItems(items, room)
}

export const BOQ_TYPE_META = {
  residential: {
    label: 'Residential',
    section: 'INTERIOR / JOINERY',
    gradeLabel: 'BWR – IS 303',
    roomSuggestions: ['INTERIOR / JOINERY', 'Living', 'Bedroom', 'Kitchen', 'Bathroom', 'Dining', 'Balcony'],
  },
  commercial: {
    label: 'Commercial',
    section: 'INTERIOR / JOINERY',
    gradeLabel: 'BWP – 710 GRADE',
    roomSuggestions: ['INTERIOR / JOINERY', 'Lobby', 'Office', 'Corridor', 'Reception', 'Conference', 'Pantry'],
  },
}
