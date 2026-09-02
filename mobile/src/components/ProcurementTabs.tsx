import { Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'

export type ProcurementTab = 'rfqs' | 'pos' | 'vendors'

const TABS: { key: ProcurementTab; label: string }[] = [
  { key: 'rfqs', label: 'RFQs' },
  { key: 'pos', label: 'Purchase orders' },
  { key: 'vendors', label: 'Vendors' },
]

export function ProcurementTabs({ value, onChange }: { value: ProcurementTab; onChange: (v: ProcurementTab) => void }) {
  const colors = useColors()
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      {TABS.map((tab) => {
        const active = tab.key === value
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.label, { color: active ? colors.textPrimary : colors.textMuted }]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  label: { ...typography.caption, fontWeight: '600' },
})
