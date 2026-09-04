import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

/**
 * Progressive disclosure for a form's optional fields.
 *
 * Create sheets were growing tall enough to feel like a page, and the cost fell
 * on the common case: someone filling only the two required fields still had to
 * scroll past everything else to reach the submit button. Optional fields live
 * in here instead — present, one tap away, but not charged to every user on
 * every visit.
 *
 * Deliberately not animated. `LayoutAnimation` is a no-op under the New
 * Architecture, and a height animation on a block containing text inputs
 * fights the keyboard for the same pixels. Swapping the chevron is enough to
 * show the state changed.
 */
export function CollapsibleSection({
  label = 'Add details',
  children,
  defaultOpen = false,
}: {
  /** Spec wording: "Add details" for optional, "More options" for advanced. */
  label?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [open, setOpen] = useState(defaultOpen)

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name={open ? 'remove' : 'add'} size={16} color={colors.accent} />
        <Text style={styles.toggleText}>{label}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textMuted}
        />
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    wrap: { gap: spacing.md },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    /** Pushes the chevron to the far edge without a spacer view. */
    toggleText: { ...typography.captionStrong, color: c.textSecondary, flex: 1 },
    body: { gap: spacing.md },
  })
}
