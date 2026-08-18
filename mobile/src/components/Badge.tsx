import { StyleSheet, Text, View } from 'react-native'
import { colors, PRIORITY_LABELS, radius, STATUS_LABELS, typography } from '../constants/theme'
import type { TaskPriority, TaskStatus } from '../types/models'

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`
}

export function StatusBadge({ status }: { status: TaskStatus | string }) {
  const color = colors.status[status] || colors.textMuted
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, '22') }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {STATUS_LABELS[status] || status}
      </Text>
    </View>
  )
}

export function PriorityBadge({ priority }: { priority: TaskPriority | string }) {
  const color = colors.priority[priority] || colors.textMuted
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, '22') }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {PRIORITY_LABELS[priority] || priority}
      </Text>
    </View>
  )
}

export function Pill({ label, color = colors.textSecondary, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg || colors.surfaceRaised }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { ...typography.micro },
})
