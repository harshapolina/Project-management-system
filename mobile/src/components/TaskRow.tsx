import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, spacing, typography } from '../constants/theme'
import { PriorityBadge } from './Badge'
import type { Task } from '../types/models'

function projectName(task: Task): string | null {
  if (task.isPersonal) return 'Personal'
  if (task.projectId && typeof task.projectId === 'object') return task.projectId.name
  return null
}

function formatDue(date?: string | null): { label: string; overdue: boolean } | null {
  if (!date) return null
  const due = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000)
  const overdue = diffDays < 0
  let label: string
  if (diffDays === 0) label = 'Today'
  else if (diffDays === 1) label = 'Tomorrow'
  else if (diffDays === -1) label = 'Yesterday'
  else label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return { label, overdue }
}

export function TaskRow({
  task,
  onPress,
  onToggle,
}: {
  task: Task
  onPress: () => void
  onToggle?: () => void
}) {
  const due = formatDue(task.dueDate)
  const pName = projectName(task)
  const done = task.status === 'done'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceRaised }]}
      accessibilityRole="button"
      accessibilityLabel={task.title}
    >
      {onToggle ? (
        <Pressable
          onPress={onToggle}
          hitSlop={10}
          style={[styles.checkbox, done && styles.checkboxDone]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
        >
          {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </Pressable>
      ) : null}

      <View style={styles.content}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          {pName ? (
            <Text style={styles.meta} numberOfLines={1}>
              {pName}
            </Text>
          ) : null}
          {due ? (
            <Text style={[styles.meta, due.overdue && !done && styles.metaOverdue]} numberOfLines={1}>
              {pName ? ' · ' : ''}
              {due.label}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.trailing}>
        <PriorityBadge priority={task.priority} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: colors.success, borderColor: colors.success },
  content: { flex: 1, gap: 3, minWidth: 0 },
  title: { ...typography.bodyStrong, color: colors.textPrimary },
  titleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  meta: { ...typography.caption, color: colors.textSecondary },
  metaOverdue: { color: colors.danger, fontWeight: '600' },
  trailing: { flexShrink: 0 },
})
