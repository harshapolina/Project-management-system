import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { Bone } from './Skeleton'
import { projectsApi } from '../api/projects'

interface ProjectPickerProps {
  label?: string
  value?: string
  onChange: (projectId: string, projectName: string) => void
  error?: string
}

/** Horizontal chip picker for the project a record belongs to. */
export function ProjectPicker({ label = 'Project', value, onChange, error }: ProjectPickerProps) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() })

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <View style={styles.skelRow}>
          <Bone width={110} height={32} radius={radius.full} />
          <Bone width={96} height={32} radius={radius.full} />
          <Bone width={120} height={32} radius={radius.full} />
        </View>
      ) : !data?.length ? (
        <Text style={styles.hint}>No projects available.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {data.map((p) => {
            const active = value === p._id
            return (
              <Text
                key={p._id}
                onPress={() => onChange(p._id, p.name)}
                style={[styles.chip, active && styles.chipActive]}
                numberOfLines={1}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {p.name}
              </Text>
            )
          })}
        </ScrollView>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
      maxWidth: 220,
    },
    chipActive: { backgroundColor: c.textPrimary, color: c.canvas },
    error: { ...typography.caption, color: c.danger },
  })
}
