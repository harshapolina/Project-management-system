import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChromeFill } from '../../components/NestedChrome'
import { Input } from '../../components/Input'
import { KanbanBoard } from '../../components/KanbanBoard'
import { ViewPills, type MyWorkView, MY_WORK_LABELS } from '../../components/ViewPills'
import { SurfaceCard } from '../../components/SurfaceCard'
import { StatusBadge } from '../../components/Badge'
import { EmptyState } from '../../components/States'
import { spacing, typography } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { homeApi } from '../../api/home'
import type { Task } from '../../types/models'

export function MyWorkViews({
  view,
  onViewChange,
  onTaskPress,
  onCreatePersonal,
}: {
  view: MyWorkView
  onViewChange: (v: MyWorkView) => void
  onTaskPress: (task: Task) => void
  onCreatePersonal?: () => void
}) {
  const colors = useColors()
  const { listContent, pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(pagePadding), [pagePadding])
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['home'], queryFn: homeApi.get })

  const toggleMut = useMutation({
    mutationFn: (id: string) => homeApi.toggleTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['home'] }),
  })

  if (isLoading || !data) return null

  const match = (t: Task) => !search.trim() || t.title.toLowerCase().includes(search.toLowerCase())

  let tasks: Task[] = []
  if (view === 'assigned') tasks = data.tasks.assigned.filter(match)
  if (view === 'today') tasks = [...data.tasks.overdue, ...data.tasks.today].filter((t) => t.status !== 'done').filter(match)
  if (view === 'personal') tasks = (data.tasks.personal || []).filter(match)
  if (view === 'history') tasks = data.tasks.done.filter(match)
  if (view === 'all') tasks = [...data.tasks.assigned, ...data.tasks.today].filter((t) => t.status !== 'done').filter(match)

  const isKanban = view === 'assigned' || view === 'personal' || view === 'all'

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ViewPills value={view} onChange={onViewChange} inset={false} />
        <Input placeholder="Search tasks…" value={search} onChangeText={setSearch} />
      </View>

      <ChromeFill style={styles.content}>
        {isKanban ? (
          <KanbanBoard
            tasks={tasks}
            onTaskPress={onTaskPress}
            onToggle={(t) => toggleMut.mutate(t._id)}
          />
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(t) => t._id}
            style={styles.flex}
            contentContainerStyle={listContent}
            onRefresh={refetch}
            refreshing={isRefetching}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState
                title={view === 'today' ? 'Nothing due' : 'No completed tasks'}
                body={view === 'today' ? "You're clear for today." : 'Finished tasks appear here.'}
              />
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => onTaskPress(item)}>
                <SurfaceCard style={styles.row}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
                  <StatusBadge status={item.status} />
                </SurfaceCard>
              </Pressable>
            )}
          />
        )}
      </ChromeFill>

      {view === 'personal' && onCreatePersonal ? (
        <Pressable style={styles.footer} onPress={onCreatePersonal}>
          <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Add personal task</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Title for PageHeader when showing a My Work sub-view. */
export function myWorkHeaderTitle(view: MyWorkView) {
  return MY_WORK_LABELS[view] || 'My work'
}

function createStyles(pagePadding: number) {
  return StyleSheet.create({
    wrap: { flex: 1, minHeight: 0 },
    header: { gap: spacing.md, paddingHorizontal: pagePadding, paddingBottom: spacing.sm },
    content: { flex: 1, minHeight: 0 },
    flex: { flex: 1, minHeight: 0 },
    footer: { paddingHorizontal: pagePadding, paddingVertical: spacing.sm },
    row: { marginBottom: spacing.sm, gap: spacing.xs },
    title: { ...typography.body, fontWeight: '600' },
  })
}
