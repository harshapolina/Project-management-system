import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { colors, radius, spacing, typography } from '../constants/theme'
import { projectsApi } from '../api/projects'

interface ProjectPickerProps {
  label?: string
  value?: string
  onChange: (projectId: string, projectName: string) => void
  error?: string
}

/** Horizontal chip picker for the project a record (PO, expense, BOQ, site
 * update…) belongs to. A native `<select>` doesn't exist in RN — this
 * matches the chip pattern already used for status/type pickers elsewhere. */
export function ProjectPicker({ label = 'Project', value, onChange, error }: ProjectPickerProps) {
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() })

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {isLoading ? (
        <Text style={styles.hint}>Loading projects…</Text>
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
    maxWidth: 220,
  },
  chipActive: { backgroundColor: colors.rail, color: '#fff' },
  error: { ...typography.caption, color: colors.danger },
})
