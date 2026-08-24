import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { Bone } from './Skeleton'
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
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <View style={styles.skelRow}>
          <Bone width={100} height={32} radius={radius.full} />
          <Bone width={88} height={32} radius={radius.full} />
          <Bone width={112} height={32} radius={radius.full} />
        </View>
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

function createStyles(c: AppColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: { ...typography.captionStrong, color: c.textSecondary },
    hint: { ...typography.caption, color: c.textMuted },
    row: { gap: spacing.sm, paddingVertical: 2 },
    skelRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
    chip: {
      ...typography.caption,
      color: c.textSecondary,
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      overflow: 'hidden',
      maxWidth: 200,
    },
    chipActive: { backgroundColor: c.textPrimary, color: c.canvas },
  })
}
