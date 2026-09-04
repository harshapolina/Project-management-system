import { Ionicons } from '@expo/vector-icons'
import type { StyleProp, TextStyle } from 'react-native'
import { iconSize, type Glyph, type IconSizeToken } from '../icons'

/**
 * Single renderer for Ionicons. Size tokens keep optical weight consistent;
 * pass a number when a one-off must match an existing well or chip.
 */
export function Icon({
  name,
  color,
  size = 'inline',
  decorative = false,
  style,
}: {
  name: Glyph
  color: string
  size?: IconSizeToken | number
  /** Hide from assistive tech when a visible label already names the control. */
  decorative?: boolean
  style?: StyleProp<TextStyle>
}) {
  const px = typeof size === 'number' ? size : iconSize[size]
  return (
    <Ionicons
      name={name}
      size={px}
      color={color}
      style={style}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'auto'}
    />
  )
}
