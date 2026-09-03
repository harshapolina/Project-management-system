/** Indian rupees → words (for tax invoices). */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
]

function twoDigits(n) {
  if (n < 20) return ONES[n]
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ')
}

function threeDigits(n) {
  const h = Math.floor(n / 100)
  const rest = n % 100
  return [
    h ? `${ONES[h]} Hundred` : '',
    rest ? twoDigits(rest) : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function chunkToWords(n) {
  if (n === 0) return ''
  if (n < 100) return twoDigits(n)
  return threeDigits(n)
}

function integerToWords(n) {
  if (!Number.isFinite(n) || n === 0) return 'Zero'
  if (n < 0) return `Minus ${integerToWords(-n)}`

  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const rest = n % 1000

  return [
    crore ? `${chunkToWords(crore)} Crore` : '',
    lakh ? `${chunkToWords(lakh)} Lakh` : '',
    thousand ? `${chunkToWords(thousand)} Thousand` : '',
    rest ? chunkToWords(rest) : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * @param {number} amount — rupees (supports paise)
 * @returns {string} e.g. "Indian Rupees Ten Lakh … and Sixty Two paise Only"
 */
export function amountInWords(amount) {
  const n = Math.round((Number(amount) || 0) * 100)
  const rupees = Math.floor(n / 100)
  const paise = n % 100

  let out = `Indian Rupees ${integerToWords(rupees)}`
  if (paise) {
    out += ` and ${integerToWords(paise)} ${paise === 1 ? 'paise' : 'paise'}`
  }
  return `${out} Only`
}
