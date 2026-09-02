import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { StatusBadge } from './Badge'
import { SurfaceCard } from './SurfaceCard'
import { spacing, TAB_BAR_CLEARANCE, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'
import type { Task, TaskStatus } from '../types/models'

const DEFAULT_COLUMNS: { key: TaskStatus; title: string }[] = [
  { key: 'todo', title: 'To do' },
  { key: 'in_progress', title: 'In progress' },
  { key: 'review', title: 'Review' },
  { key: 'done', title: 'Done' },
]

export function KanbanBoard({
  tasks,
  onTaskPress,
  onToggle,
  columns = DEFAULT_COLUMNS,
  style,
}: {
  tasks: Task[]
  onTaskPress: (task: Task) => void
  onToggle?: (task: Task) => void
  columns?: { key: TaskStatus; title: string }[]
  style?: StyleProp<ViewStyle>
}) {
  const colors = useColors()
  const { pagePadding } = useResponsive()

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      style={[styles.boardScroll, style]}
      contentContainerStyle={[
        styles.board,
        { paddingHorizontal: pagePadding, paddingBottom: TAB_BAR_CLEARANCE + spacing.md },
      ]}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key)
        return (
          <View key={col.key} style={[styles.column, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.colTitle, { color: colors.textSecondary }]}>
              {col.title} · {colTasks.length}
            </Text>
            <ScrollView
              nestedScrollEnabled
              style={styles.columnScroll}
              contentContainerStyle={styles.columnContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {colTasks.map((task) => (
                <Pressable key={task._id} onPress={() => onTaskPress(task)}>
                  <SurfaceCard style={styles.card}>
                    <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                      {task.title}
                    </Text>
                    {typeof task.projectId === 'object' && task.projectId?.name ? (
                      <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                        {task.projectId.name}
                      </Text>
                    ) : null}
                    <View style={styles.row}>
                      <StatusBadge status={task.status} />
                      {onToggle && task.status !== 'done' ? (
                        <Pressable onPress={() => onToggle(task)} hitSlop={8}>
                          <Text style={{ color: colors.accent, ...typography.micro }}>Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </SurfaceCard>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  boardScroll: { flex: 1, minHeight: 0 },
  board: {
    flexGrow: 1,
    alignItems: 'stretch',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  column: {
    width: 280,
    borderRadius: 12,
    padding: spacing.sm,
    alignSelf: 'stretch',
  },
  columnScroll: { flex: 1, minHeight: 0 },
  columnContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  colTitle: { ...typography.micro, fontWeight: '700', paddingHorizontal: spacing.xs, marginBottom: spacing.xs },
  card: { gap: spacing.xs },
  title: { ...typography.body, fontWeight: '600' },
  meta: { ...typography.micro },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
})
