import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { colors, radius, spacing, typography } from '../constants/theme'
import { vendorsApi } from '../api/procurement'

export function VendorPicker({
  value,
  onChange,
  label = 'Vendor (optional)',
}: {
  value?: string
  onChange: (vendorId: string) => void
  label?: string
}) {
  const { data, isLoading } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <Text style={styles.hint}>Loading vendors…</Text>
      ) : !data?.length ? (
        <Text style={styles.hint}>No vendors yet — add one first.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {data.map((v) => {
            const active = value === v._id
            return (
              <Text
                key={v._id}
                onPress={() => onChange(v._id)}
                style={[styles.chip, active && styles.chipActive]}
                numberOfLines={1}
              >
                {v.name}
              </Text>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...typography.captionStrong, color: colors.textSecondary },
  hint: { ...typography.caption, color: colors.textMuted },
  row: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
    maxWidth: 200,
  },
  chipActive: { backgroundColor: colors.rail, color: '#fff' },
})
