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
import { AgendaCard } from '../../components/AgendaCard'
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
  onOpenCalendar,
  embedded = false,
}: {
  view: MyWorkView
  onViewChange: (v: MyWorkView) => void
  onTaskPress: (task: Task) => void
  onCreatePersonal?: () => void
  onOpenCalendar?: () => void
  /**
   * Render inside Home's sheet instead of owning a screen.
   *
   * The standalone layout can't simply be dropped into the sheet: it fills a
   * flex parent and scrolls with a FlatList, and both collapse inside the
   * sheet's own ScrollView. Embedded mode drops its copy of the pills (the
   * sheet already shows them), maps the rows out instead of virtualising, and
   * takes its height from content so the sheet keeps scrolling as one page.
   */
  embedded?: boolean
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

  const taskRow = (item: Task) => (
    <Pressable key={item._id} onPress={() => onTaskPress(item)}>
      <SurfaceCard style={styles.row}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
        <StatusBadge status={item.status} />
      </SurfaceCard>
    </Pressable>
  )

  if (embedded) {
    return (
      <View style={styles.embedded}>
        <Input placeholder="Search tasks…" value={search} onChangeText={setSearch} />
        {view === 'today' ? <AgendaCard onConnect={onOpenCalendar} /> : null}
        {tasks.length === 0 ? (
          <EmptyState
            title={view === 'today' ? 'Nothing due' : 'No tasks here'}
            body={
              view === 'today'
                ? "You're clear for today."
                : 'Tasks matching this view will show up here.'
            }
          />
        ) : (
          tasks.map(taskRow)
        )}
        {view === 'personal' && onCreatePersonal ? (
          <Pressable style={styles.footer} onPress={onCreatePersonal}>
            <Text style={{ color: colors.accent, fontWeight: '600' }}>+ Add personal task</Text>
          </Pressable>
        ) : null}
      </View>
    )
  }

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
            ListHeaderComponent={
              view === 'today' ? <AgendaCard onConnect={onOpenCalendar} /> : null
            }
            ListEmptyComponent={
              <EmptyState
                title={view === 'today' ? 'Nothing due' : 'No completed tasks'}
                body={view === 'today' ? "You're clear for today." : 'Finished tasks appear here.'}
              />
            }
            renderItem={({ item }) => taskRow(item)}
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
    /** Height comes from content — the sheet above it owns the scrolling. */
    embedded: { gap: spacing.md },
    header: { gap: spacing.md, paddingHorizontal: pagePadding, paddingBottom: spacing.sm },
    content: { flex: 1, minHeight: 0 },
    flex: { flex: 1, minHeight: 0 },
    footer: { paddingHorizontal: pagePadding, paddingVertical: spacing.sm },
    row: { marginBottom: spacing.sm, gap: spacing.xs },
    title: { ...typography.body, fontWeight: '600' },
  })
}
