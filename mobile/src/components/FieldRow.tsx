import type { ReactNode } from 'react'
import { Children, cloneElement, isValidElement } from 'react'
import { StyleSheet, View } from 'react-native'
import { spacing } from '../constants/theme'
import { useResponsive } from '../theme/useResponsive'

/**
 * Puts two short, related fields on one row — phone and location, date and
 * budget — so a form costs fewer vertical pixels than one field per line.
 *
 * Only for fields that stay legible at half width. Names, descriptions and
 * notes stay full width; halving them just moves the scrolling problem into
 * the field itself.
 *
 * Falls back to stacking on compact screens, where two columns leave each
 * field too narrow to read its own placeholder.
 */
export function FieldRow({ children }: { children: ReactNode }) {
  const { isCompact } = useResponsive()

  // `minWidth: 0` matters: without it a long placeholder sets the intrinsic
  // width and the row overflows instead of splitting evenly.
  const items = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child, {
          containerStyle: [{ flex: 1, minWidth: 0 }, (child.props as { containerStyle?: unknown }).containerStyle],
        } as Record<string, unknown>)
      : child,
  )

  return <View style={isCompact ? styles.stack : styles.row}>{isCompact ? children : items}</View>
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stack: { gap: spacing.md },
})
