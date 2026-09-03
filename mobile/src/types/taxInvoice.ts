/** GST tax invoice — mirrors server/src/models/ClientInvoice.js. */

export type TaxInvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled'
export type TaxInvoiceType = 'tax' | 'proforma'
export type GstMode = 'cgst_sgst' | 'igst'

export interface TaxInvoiceLine {
  _id?: string
  description: string
  hsnSac: string
  gstRate: number
  qty: number
  unit: string
  rate: number
  amount: number
}

export interface TaxInvoiceParty {
  name?: string
  address?: string
  gstin?: string
  stateName?: string
  stateCode?: string
}

export interface TaxInvoiceBank {
  accountName?: string
  bankName?: string
  accountNo?: string
  branch?: string
  ifsc?: string
}

export interface TaxInvoice {
  _id: string
  invoiceNumber: string
  invoiceDate?: string
  invoiceType: TaxInvoiceType
  status: TaxInvoiceStatus
  projectId?: { _id: string; name: string; clientName?: string } | string
  quotationId?: { _id: string; title?: string; versionLabel?: string; grandTotal?: number } | string

  companyName?: string
  companyAddress?: string
  companyGstin?: string
  companyStateName?: string
  companyStateCode?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  companyLogo?: string

  buyersOrderNo?: string
  buyersOrderDate?: string
  deliveryNote?: string
  modeOfPayment?: string
  referenceNo?: string
  dispatchDocNo?: string
  dispatchedThrough?: string
  destination?: string

  consignee?: TaxInvoiceParty
  buyer?: TaxInvoiceParty

  items: TaxInvoiceLine[]

  gstMode: GstMode
  cgstPercent: number
  sgstPercent: number
  igstPercent: number

  bank?: TaxInvoiceBank
  signatoryName?: string
  signatoryTitle?: string
  declaration?: string
  jurisdiction?: string
  notes?: string

  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  grandTotal: number

  createdAt: string
  updatedAt: string
}
