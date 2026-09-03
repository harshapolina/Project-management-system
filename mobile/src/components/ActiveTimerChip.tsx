import { Pressable, StyleSheet, Text } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { radius, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { tasksApi } from '../api/tasks'
import { formatTrackedSeconds, liveTrackedSeconds } from '../utils/time'

export function ActiveTimerChip({ onPress }: { onPress?: () => void }) {
  const colors = useColors()
  const { data: task } = useQuery({ queryKey: ['active-timer'], queryFn: tasksApi.activeTimer, refetchInterval: 1000 })

  if (!task) return null
  const secs = liveTrackedSeconds(task.timeSpent, task.timeTrackingStartedAt)

  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: `${colors.accent}22` }]}>
      <Text style={[styles.text, { color: colors.accent }]} numberOfLines={1}>
        {formatTrackedSeconds(secs)} · {task.title}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, maxWidth: 160 },
  text: { ...typography.micro, fontWeight: '700' },
})
