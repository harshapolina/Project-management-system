import { StyleSheet, Text, View } from 'react-native'
import { Input } from './Input'
import { spacing, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'
import type { CustomFieldDefinition } from '../types/models'

export function CustomFieldRenderer({
  fields,
  values,
  onChange,
  readOnly,
}: {
  fields: CustomFieldDefinition[]
  values: Record<string, unknown>
  onChange?: (slug: string, value: unknown) => void
  readOnly?: boolean
}) {
  const colors = useColors()
  const active = fields.filter((f) => f.isActive !== false)

  if (!active.length) return null

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>Custom fields</Text>
      {active.map((field) => {
        const val = values[field.slug]
        if (readOnly || !onChange) {
          return (
            <View key={field._id} style={styles.row}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{field.name}</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{String(val ?? '—')}</Text>
            </View>
          )
        }
        if (field.type === 'number') {
          return (
            <Input
              key={field._id}
              label={field.name}
              value={val != null ? String(val) : ''}
              onChangeText={(t) => onChange(field.slug, t ? Number(t) : null)}
              keyboardType="numeric"
            />
          )
        }
        if (field.type === 'select' && field.options?.length) {
          return (
            <View key={field._id} style={styles.row}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{field.name}</Text>
              <Text
                style={{ color: colors.accent }}
                onPress={() => {
                  const idx = field.options!.indexOf(String(val || ''))
                  const next = field.options![(idx + 1) % field.options!.length]
                  onChange(field.slug, next)
                }}
              >
                {String(val || 'Tap to set')}
              </Text>
            </View>
          )
        }
        return (
          <Input
            key={field._id}
            label={field.name}
            value={val != null ? String(val) : ''}
            onChangeText={(t) => onChange(field.slug, t)}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  heading: { ...typography.caption, fontWeight: '700', textTransform: 'uppercase' },
  row: { gap: 4 },
  label: { ...typography.micro },
  value: { ...typography.body },
})
