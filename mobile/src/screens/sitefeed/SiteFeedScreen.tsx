import { useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { NestedChrome } from '../../components/NestedChrome'
import { Fab } from '../../components/Fab'
import { Avatar } from '../../components/Avatar'
import { SurfaceCard } from '../../components/SurfaceCard'
import { StatCard } from '../../components/StatCard'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SearchField } from '../../components/SearchField'
import { PhotoStrip } from '../../components/PhotoStrip'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, TAB_BAR_CLEARANCE, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { siteFeedApi } from '../../api/siteFeed'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import type { SiteUpdate } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'
import { dayKey, dayLabel, isToday, timeAgo } from '../../utils/time'

type Props = NativeStackScreenProps<SharedOpsParamList, 'SiteFeed'>

type FeedView = 'all' | 'today' | 'photos'

const VIEWS: { key: FeedView; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'photos', label: 'With photos' },
]

function projectIdOf(update: SiteUpdate): string {
  const p = update.projectId
  if (!p) return ''
  return typeof p === 'object' ? p._id : p
}

function projectNameOf(update: SiteUpdate): string | undefined {
  const p = update.projectId
  return p && typeof p === 'object' ? p.name : undefined
}

export function SiteFeedScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId: scopedProjectId, projectName } = route.params || {}
  const [selected, setSelected] = useState<SiteUpdate | null>(null)
  const [view, setView] = useState<FeedView>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [projectSearch, setProjectSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['site-updates', scopedProjectId ?? 'all'],
    queryFn: () => siteFeedApi.updates(scopedProjectId ? { projectId: scopedProjectId } : undefined),
  })

  // Only needed for the cross-project filter, which a project-scoped feed hides.
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    enabled: !scopedProjectId,
  })

  const updates = useMemo(() => data || [], [data])

  const stats = useMemo(() => {
    const today = updates.filter((u) => isToday(u.createdAt)).length
    const withPhotos = updates.filter((u) => (u.photos?.length || 0) > 0).length
    const sites = new Set(updates.map(projectIdOf).filter(Boolean)).size
    return { total: updates.length, today, withPhotos, sites }
  }, [updates])

  const filtered = useMemo(
    () =>
      updates.filter((u) => {
        if (projectFilter !== 'all' && projectIdOf(u) !== projectFilter) return false
        if (view === 'today' && !isToday(u.createdAt)) return false
        if (view === 'photos' && !(u.photos?.length || 0)) return false
        return true
      }),
    [updates, projectFilter, view],
  )

  // Grouped by calendar day, newest first — mirrors the web feed's day rails.
  const sections = useMemo(() => {
    const byDay = new Map<string, { title: string; data: SiteUpdate[] }>()
    for (const u of filtered) {
      const key = dayKey(u.createdAt)
      if (!byDay.has(key)) byDay.set(key, { title: dayLabel(u.createdAt), data: [] })
      byDay.get(key)!.data.push(u)
    }
    return [...byDay.values()]
  }, [filtered])

  const activeProjectName = useMemo(() => {
    if (projectFilter === 'all') return 'All sites'
    const hit = projectsQuery.data?.find((p) => p._id === projectFilter)
    return hit?.name || 'Selected site'
  }, [projectFilter, projectsQuery.data])

  const visibleProjects = useMemo(() => {
    const list = projectsQuery.data || []
    const q = projectSearch.trim().toLowerCase()
    if (!q) return list
    return list.filter((p) => p.name?.toLowerCase().includes(q))
  }, [projectsQuery.data, projectSearch])

  const chromeProps = {
    title: projectName || 'Site updates',
    subtitle: 'Photos and daily logs',
    subtitleIcon: 'camera-outline' as const,
  }

  const selectedPhotos = selected?.photos || []

  return (
    <NestedChrome {...chromeProps}>
      {isLoading ? (
        <LoadingState label="Loading site feed…" variant="cards" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(u) => u._id}
          contentContainerStyle={[listContent, { paddingBottom: TAB_BAR_CLEARANCE + spacing.xl }]}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.statsGrid}>
                <StatCard label="Updates" value={stats.total} icon="documents-outline" />
                <StatCard label="Posted today" value={stats.today} icon="today-outline" />
                <StatCard label="Active sites" value={stats.sites} icon="business-outline" />
                <StatCard label="With photos" value={stats.withPhotos} icon="images-outline" />
              </View>

              <SegmentedControl
                options={VIEWS}
                value={view}
                onChange={setView}
                inset={false}
                style={{ paddingHorizontal: 0 }}
              />

              {!scopedProjectId ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by site. Currently ${activeProjectName}`}
                  style={({ pressed }) => [styles.filterBar, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.filterLabel}>Site</Text>
                  <Text style={styles.filterValue} numberOfLines={1}>
                    {activeProjectName}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.dayHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const pName = projectNameOf(item)
            return (
              <SurfaceCard onPress={() => setSelected(item)}>
                <View style={styles.cardTop}>
                  <Avatar name={item.author.name} uri={item.author.avatar} size={32} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.author} numberOfLines={1}>
                      {item.author.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[pName, timeAgo(item.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {item.progress != null ? <Text style={styles.progress}>{item.progress}%</Text> : null}
                </View>
                <Text style={styles.note} numberOfLines={4}>
                  {item.note}
                </Text>
                <PhotoStrip photos={item.photos} style={{ marginTop: spacing.sm }} />
              </SurfaceCard>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              icon="camera-outline"
              title={view === 'all' ? 'No site updates yet' : 'Nothing matches this filter'}
              body={
                view === 'all'
                  ? 'Field progress notes will show up here.'
                  : 'Try another filter, or post the first update for today.'
              }
            />
          }
        />
      )}

      <Fab
        label="Post update"
        onPress={() =>
          navigation.navigate('PostSiteUpdate', {
            projectId: scopedProjectId || (projectFilter !== 'all' ? projectFilter : undefined),
            projectName,
          })
        }
      />

      {/* Update detail */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {selected ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.cardTop}>
                  <Avatar name={selected.author.name} uri={selected.author.avatar} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.author} numberOfLines={1}>
                      {selected.author.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[projectNameOf(selected), timeAgo(selected.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {selected.progress != null ? (
                    <Text style={styles.progress}>{selected.progress}%</Text>
                  ) : null}
                </View>
                <Text style={styles.modalNote}>{selected.note}</Text>
                {selectedPhotos.length ? (
                  <PhotoStrip photos={selectedPhotos} size={104} style={{ marginTop: spacing.md }} />
                ) : (
                  <Text style={styles.photoHint}>No photos attached</Text>
                )}
                <Pressable style={styles.closeBtn} onPress={() => setSelected(null)} accessibilityRole="button">
                  <Text style={styles.closeBtnLabel}>Close</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Site filter — searchable, never a wall of pills */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.modalSheet, styles.pickerSheet]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>Filter by site</Text>
            <SearchField
              value={projectSearch}
              onChangeText={setProjectSearch}
              placeholder="Search projects"
              inset={false}
            />
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              <Pressable
                style={[styles.pickerRow, projectFilter === 'all' && styles.pickerRowActive]}
                onPress={() => {
                  setProjectFilter('all')
                  setPickerOpen(false)
                }}
                accessibilityRole="button"
              >
                <Text style={styles.pickerRowText}>All sites</Text>
                <Text style={styles.meta}>{updates.length}</Text>
              </Pressable>
              {visibleProjects.map((p) => {
                const count = updates.filter((u) => projectIdOf(u) === p._id).length
                return (
                  <Pressable
                    key={p._id}
                    style={[styles.pickerRow, projectFilter === p._id && styles.pickerRowActive]}
                    onPress={() => {
                      setProjectFilter(p._id)
                      setPickerOpen(false)
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pickerRowText} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.meta}>{count}</Text>
                  </Pressable>
                )
              })}
              {!visibleProjects.length ? (
                <Text style={[styles.meta, { padding: spacing.md }]}>No projects match that search.</Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    header: { gap: spacing.md },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    filterLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    filterValue: { ...typography.captionStrong, color: c.textPrimary, flexShrink: 1, textAlign: 'right' },
    dayHeader: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing.sm,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    author: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    progress: { ...typography.captionStrong, color: c.accent },
    note: { ...typography.body, color: c.textPrimary },
    photoHint: { ...typography.caption, color: c.textMuted, marginTop: spacing.xs },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      maxHeight: '82%',
    },
    modalNote: { ...typography.body, color: c.textPrimary, marginTop: spacing.sm },
    closeBtn: {
      marginTop: spacing.md,
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    closeBtnLabel: { ...typography.captionStrong, color: c.textPrimary },
    pickerSheet: { gap: spacing.md },
    pickerTitle: { ...typography.h3, color: c.textPrimary },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    },
    pickerRowActive: { backgroundColor: c.accentSoft },
    pickerRowText: { ...typography.body, color: c.textPrimary, flexShrink: 1 },
  })
}
