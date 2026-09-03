import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { radius, spacing, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

export type MyWorkView = 'assigned' | 'today' | 'personal' | 'history' | 'all'

export const MY_WORK_LABELS: Record<MyWorkView, string> = {
  assigned: 'Assigned',
  today: 'Today',
  personal: 'Personal',
  history: 'History',
  all: 'Overview',
}

/**
 * Overview leads: it's the default view, and sitting last it started out
 * selected but scrolled off the right edge — the one pill you couldn't see was
 * the one you were on.
 */
const VIEWS: { key: MyWorkView; label: string }[] = [
  { key: 'all', label: MY_WORK_LABELS.all },
  { key: 'assigned', label: MY_WORK_LABELS.assigned },
  { key: 'today', label: MY_WORK_LABELS.today },
  { key: 'personal', label: MY_WORK_LABELS.personal },
  { key: 'history', label: MY_WORK_LABELS.history },
]

export function ViewPills({
  value,
  onChange,
  inset = true,
}: {
  value: MyWorkView
  onChange: (v: MyWorkView) => void
  /** When false, parent owns horizontal padding. */
  inset?: boolean
}) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      nestedScrollEnabled
      style={styles.scroll}
      contentContainerStyle={[styles.row, inset && { paddingHorizontal: pagePadding }]}
      keyboardShouldPersistTaps="handled"
    >
      {VIEWS.map((v) => {
        const active = value === v.key
        return (
          <Pressable
            key={v.key}
            onPress={() => onChange(v.key)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.accent : colors.surfaceRaised,
                borderColor: active ? colors.accent : colors.border,
              },
            ]}
          >
            <Text style={[styles.label, { color: active ? colors.textOnAccent : colors.textSecondary }]}>
              {v.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  label: { ...typography.caption, fontWeight: '600' },
})
