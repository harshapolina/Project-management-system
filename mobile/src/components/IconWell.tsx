import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { radius, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { iconSize, outlineName, type Glyph } from '../icons'
import { Icon } from './Icon'

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
  name: Glyph
  tone?: IconTone
  /** Visual size of the glyph (default well). */
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
  size = iconSize.button,
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
      <Icon name={glyph} size={size} color={pair.fg} decorative />
    </View>
  )
}

export { outlineName } from '../icons'

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
