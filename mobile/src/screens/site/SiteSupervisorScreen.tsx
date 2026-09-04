import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ChromeFill, flexFill, NestedChrome } from '../../components/NestedChrome'
import { ProjectPicker } from '../../components/ProjectPicker'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { KanbanBoard } from '../../components/KanbanBoard'
import { spacing, typography } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { homeApi } from '../../api/home'
import { financeApi } from '../../api/finance'
import { siteFeedApi } from '../../api/siteFeed'
import type { HomeStackParamList } from '../../navigation/types'
import type { Task } from '../../types/models'

type Props = NativeStackScreenProps<HomeStackParamList, 'SiteSupervisor'>

export function SiteSupervisorScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [mode, setMode] = useState<'home' | 'update' | 'expense' | 'snags' | 'tasks'>('home')
  const [projectId, setProjectId] = useState<string | undefined>()
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [snagTitle, setSnagTitle] = useState('')

  const home = useQuery({ queryKey: ['home'], queryFn: homeApi.get })

  const actions = [
    { key: 'update', label: 'Post update', icon: 'camera-outline' as const, color: colors.accent },
    { key: 'tasks', label: 'My tasks', icon: 'checkbox-outline' as const, color: colors.success },
    { key: 'expense', label: 'Log expense', icon: 'wallet-outline' as const, color: colors.warning },
    { key: 'snags', label: 'Snags', icon: 'warning-outline' as const, color: colors.danger },
  ]

  const submitUpdate = async () => {
    if (!projectId || !note.trim()) return
    await siteFeedApi.postUpdate({ projectId, note: note.trim() })
    setNote('')
    setMode('home')
  }

  const submitExpense = async () => {
    if (!projectId || !(Number(amount) > 0)) return
    await financeApi.createExpense({ projectId, amount: Number(amount), category: 'Materials', note: 'Logged from site mode' })
    setAmount('')
    setMode('home')
  }

  const submitSnag = async () => {
    if (!projectId || !snagTitle.trim()) return
    await siteFeedApi.createSnag({ projectId, title: snagTitle.trim() })
    setSnagTitle('')
    setMode('home')
  }

  const tasks = [...(home.data?.tasks.assigned || []), ...(home.data?.tasks.today || [])].filter((t) => t.status !== 'done')

  return (
    <NestedChrome
      title="Site mode"
      subtitle="Quick actions from the field"
      subtitleIcon="phone-portrait-outline"
      keyboardAvoiding
      loading={home.isPending && !home.data}
      loadingVariant="list"
    >
      {mode === 'tasks' ? (
        <ChromeFill>
          <KanbanBoard
            tasks={tasks}
            onTaskPress={(t: Task) => navigation.navigate('TaskDetail', { taskId: t._id })}
            onToggle={(t) => homeApi.toggleTask(t._id).then(() => home.refetch())}
            style={flexFill}
          />
          <View style={styles.taskFooter}>
            <Button title="Back" variant="ghost" onPress={() => setMode('home')} />
          </View>
        </ChromeFill>
      ) : (
        <ScrollView
          contentContainerStyle={listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'home' ? (
            <>
              <ProjectPicker value={projectId} onChange={setProjectId} />
              <View style={styles.grid}>
                {actions.map((a) => (
                  <Pressable key={a.key} style={styles.tile} onPress={() => setMode(a.key as typeof mode)}>
                    <Ionicons name={a.icon} size={28} color={a.color} />
                    <Text style={[styles.tileLabel, { color: colors.textPrimary }]}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {mode === 'update' ? (
            <>
              <ProjectPicker value={projectId} onChange={setProjectId} />
              <Input label="Update" value={note} onChangeText={setNote} multiline numberOfLines={4} />
              <Button title="Post" onPress={submitUpdate} fullWidth />
              <Button title="Back" variant="ghost" onPress={() => setMode('home')} />
            </>
          ) : null}
          {mode === 'expense' ? (
            <>
              <ProjectPicker value={projectId} onChange={setProjectId} />
              <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
              <Button title="Submit expense" onPress={submitExpense} fullWidth />
              <Button title="Back" variant="ghost" onPress={() => setMode('home')} />
            </>
          ) : null}
          {mode === 'snags' ? (
            <>
              <ProjectPicker value={projectId} onChange={setProjectId} />
              <Input label="Issue title" value={snagTitle} onChangeText={setSnagTitle} />
              <Button title="Log snag" onPress={submitSnag} fullWidth />
              <Button title="Back" variant="ghost" onPress={() => setMode('home')} />
            </>
          ) : null}
        </ScrollView>
      )}
    </NestedChrome>
  )
}

function createStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    tile: {
      width: '47%',
      aspectRatio: 1.1,
      borderRadius: 16,
      backgroundColor: c.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    tileLabel: { ...typography.body, fontWeight: '600' },
    taskFooter: { flexShrink: 0, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  })
}
