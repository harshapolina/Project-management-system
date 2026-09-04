import { Ionicons } from '@expo/vector-icons'
import type { Glyph } from './glyphs'

/** Prefer outline glyphs for chrome; filled only for active/status. */
export function outlineName(name: Glyph): Glyph {
  const n = String(name)
  if (
    n.endsWith('-outline') ||
    n.endsWith('-sharp') ||
    n.startsWith('logo-') ||
    n.includes('filled')
  ) {
    return name
  }
  const candidate = `${n}-outline` as Glyph
  return (Ionicons.glyphMap as Record<string, number>)[candidate] != null ? candidate : name
}
