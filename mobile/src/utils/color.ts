/**
 * White wins only below this luminance — the point where contrast against
 * white overtakes contrast against black.
 */
const WHITE_WINS_BELOW = 0.179

/**
 * Is this colour dark enough that white sits on it more legibly than black?
 *
 * Used by the nav bar to pick its own foreground from whatever background a
 * screen hands it, rather than each screen having to declare "I am dark".
 * Deliberately theme-independent: contrast is a property of the two colours in
 * front of the user, not of which palette is active.
 *
 * Decided by WCAG contrast ratio rather than the usual "luminance < 0.5", which
 * gets mid-tones wrong — on the app's accent green a naive split would ask for
 * white text, while the rest of the app (buttons, `textOnAccent`) correctly
 * uses near-black on it.
 *
 * Anything unparseable is treated as light, matching the default canvas and
 * failing to something readable rather than invisible.
 */
export function isDarkColor(color?: string | null): boolean {
  const luminance = relativeLuminance(color)
  return luminance != null && luminance < WHITE_WINS_BELOW
}

function relativeLuminance(color?: string | null): number | null {
  const rgb = parseColor(color)
  if (!rgb) return null

  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** `#abc`, `#aabbcc`, `#aabbccdd`, `rgb(…)` and `rgba(…)` → `[r, g, b]`. */
function parseColor(color?: string | null): [number, number, number] | null {
  if (!color) return null
  const value = color.trim().toLowerCase()

  if (value.startsWith('#')) {
    let hex = value.slice(1)
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .slice(0, 3)
        .split('')
        .map((c) => c + c)
        .join('')
    }
    if (hex.length === 8) hex = hex.slice(0, 6) // drop alpha; the bar is opaque
    if (hex.length !== 6 || /[^0-9a-f]/.test(hex)) return null
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }

  const match = value.match(/^rgba?\(([^)]+)\)$/)
  if (!match) return null

  const parts = match[1].split(',').map((p) => Number(p.trim()))
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null
  return [parts[0], parts[1], parts[2]]
}
