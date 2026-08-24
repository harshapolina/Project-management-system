import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { radius, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

export type IconTone = 'accent' | 'success' | 'warning' | 'danger' | 'muted' | 'neutral'

const TONE_PAIR: Record<
  IconTone,
  (c: AppColors) => { bg: string; fg: string }
> = {
  accent: (c) => ({ bg: c.accentSoft, fg: c.accentHover }),
  success: (c) => ({ bg: c.successSoft, fg: c.success }),
  warning: (c) => ({ bg: c.warningSoft, fg: c.warning }),
  danger: (c) => ({ bg: c.dangerSoft, fg: c.danger }),
  muted: (c) => ({ bg: c.surfaceRaised, fg: c.textMuted }),
  neutral: (c) => ({ bg: c.surfaceRaised, fg: c.textPrimary }),
}

type IconWellProps = {
  name: keyof typeof Ionicons.glyphMap
  tone?: IconTone
  /** Visual size of the glyph (default 20). */
  size?: number
  /** Outer well size (default 40). */
  well?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Shared icon treatment: rounded well + outline-weight Ionicons,
 * colored only from theme tokens so light/dark stay consistent.
 */
export function IconWell({
  name,
  tone = 'accent',
  size = 20,
  well = 40,
  style,
}: IconWellProps) {
  const colors = useColors()
  const pair = TONE_PAIR[tone](colors)
  const glyph = outlineName(name)
  return (
    <View
      style={[
        styles.well,
        {
          width: well,
          height: well,
          borderRadius: Math.max(radius.md, well * 0.28),
          backgroundColor: pair.bg,
        },
        style,
      ]}
    >
      <Ionicons name={glyph} size={size} color={pair.fg} />
    </View>
  )
}

/** Prefer outline glyphs for chrome; filled only for active/status. */
export function outlineName(
  name: keyof typeof Ionicons.glyphMap,
): keyof typeof Ionicons.glyphMap {
  const n = String(name)
  if (
    n.endsWith('-outline') ||
    n.endsWith('-sharp') ||
    n.startsWith('logo-') ||
    n.includes('filled')
  ) {
    return name
  }
  const candidate = `${n}-outline` as keyof typeof Ionicons.glyphMap
  // glyphMap is a runtime object of icon names
  return (Ionicons.glyphMap as Record<string, number>)[candidate] != null ? candidate : name
}

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
