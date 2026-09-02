import { ROLE_LABELS } from '../../utils/roles'

/** Ledger categories the server emits, in the wording the web client uses. */
export const CATEGORY_LABELS: Record<string, string> = {
  productivity: 'Productivity',
  quality: 'Quality',
  collaboration: 'Collaboration',
  client: 'Client',
  attendance: 'Attendance',
  improvement: 'Improvement',
  manual: 'Manual',
  penalty: 'Penalty',
}

export function roleLabel(role?: string): string {
  if (!role) return 'Member'
  return (
    (ROLE_LABELS as Record<string, string>)[role] ||
    role
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )
}

/** Points always read as a delta — "+40" / "−15" — never a bare number. */
export function signedPoints(value?: number): string {
  const n = Number(value) || 0
  return `${n > 0 ? '+' : ''}${n.toLocaleString('en-IN')}`
}
