import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Input } from './Input'
import { spacing, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'
import type { TaskPriority, User } from '../types/models'
import { PRIORITY_LABELS } from '../constants/theme'

const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

export function TaskFieldEditor({
  assigneeId,
  assignees,
  onAssigneeChange,
  dueDate,
  onDueDateChange,
  priority,
  onPriorityChange,
  timeEstimate,
  onTimeEstimateChange,
  tags,
  onTagsChange,
  readOnly,
}: {
  assigneeId?: string | null
  assignees?: { _id: string; name: string }[]
  onAssigneeChange?: (id: string | null) => void
  dueDate?: string | null
  onDueDateChange?: (v: string) => void
  priority?: TaskPriority
  onPriorityChange?: (p: TaskPriority) => void
  timeEstimate?: number | null
  onTimeEstimateChange?: (mins: number | null) => void
  tags?: string[]
  onTagsChange?: (tags: string[]) => void
  readOnly?: boolean
}) {
  const colors = useColors()

  return (
    <View style={styles.wrap}>
      {!readOnly && assignees && onAssigneeChange ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Assignee</Text>
          <View style={styles.pills}>
            <Pressable onPress={() => onAssigneeChange(null)}>
              <Text style={{ color: !assigneeId ? colors.accent : colors.textSecondary }}>Unassigned</Text>
            </Pressable>
            {assignees.map((u) => (
              <Pressable key={u._id} onPress={() => onAssigneeChange(u._id)}>
                <Text style={{ color: assigneeId === u._id ? colors.accent : colors.textSecondary }}>{u.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {!readOnly && onDueDateChange ? (
        <Input label="Due date (YYYY-MM-DD)" value={dueDate?.slice(0, 10) || ''} onChangeText={onDueDateChange} />
      ) : dueDate ? (
        <Text style={{ color: colors.textSecondary }}>Due {dueDate.slice(0, 10)}</Text>
      ) : null}
      {!readOnly && onPriorityChange && priority ? (
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Priority</Text>
          <View style={styles.pills}>
            {PRIORITIES.map((p) => (
              <Pressable key={p} onPress={() => onPriorityChange(p)}>
                <Text style={{ color: priority === p ? colors.accent : colors.textSecondary }}>{PRIORITY_LABELS[p]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {!readOnly && onTimeEstimateChange ? (
        <Input
          label="Time estimate (minutes)"
          value={timeEstimate != null ? String(timeEstimate) : ''}
          onChangeText={(t) => onTimeEstimateChange(t ? Number(t) : null)}
          keyboardType="numeric"
        />
      ) : null}
      {!readOnly && onTagsChange ? (
        <Input
          label="Tags (comma separated)"
          value={(tags || []).join(', ')}
          onChangeText={(t) => onTagsChange(t.split(',').map((s) => s.trim()).filter(Boolean))}
        />
      ) : tags?.length ? (
        <Text style={{ color: colors.textSecondary }}>{tags.join(', ')}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { gap: spacing.xs },
  label: { ...typography.micro, fontWeight: '600' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
