import { useMemo } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { Avatar } from '../../components/Avatar'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { activityApi } from '../../api/activity'
import { isApiError } from '../../api/client'
import { dayKey, dayLabel, timeAgo } from '../../utils/time'
import type { ActivityEntry } from '../../types/models'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectActivity'>

/** Verb → icon, so the timeline reads at a glance rather than as a wall of text. */
function iconForAction(action?: string): keyof typeof Ionicons.glyphMap {
  const a = (action || '').toLowerCase()
  if (a.includes('complete') || a.includes('done')) return 'checkmark-circle-outline'
  if (a.includes('comment')) return 'chatbubble-ellipses-outline'
  if (a.includes('upload') || a.includes('file')) return 'document-attach-outline'
  if (a.includes('delete') || a.includes('remove')) return 'trash-outline'
  if (a.includes('assign')) return 'person-add-outline'
  if (a.includes('create') || a.includes('add')) return 'add-circle-outline'
  if (a.includes('approve')) return 'shield-checkmark-outline'
  if (a.includes('status') || a.includes('stage') || a.includes('move')) return 'swap-horizontal-outline'
  return 'ellipse-outline'
}

/** "created task" → "Created task" without losing the entity name. */
function describe(entry: ActivityEntry): string {
  const action = (entry.action || 'updated').replace(/_/g, ' ')
  const subject = [entry.entityType, entry.entityName].filter(Boolean).join(' ')
  const sentence = subject ? `${action} ${subject}` : action
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

export function ProjectActivityScreen({ route }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId, projectName } = route.params

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['activity', projectId],
    queryFn: () => activityApi.list({ projectId }),
  })

  const chromeProps = {
    title: 'Activity',
    subtitle: projectName || 'What changed, and who changed it',
    subtitleIcon: 'pulse-outline' as const,
  }

  // Day dividers rendered inline: a FlatList keeps the 50-entry cap cheap.
  const rows = useMemo(() => {
    const out: { entry: ActivityEntry; dayHeader?: string }[] = []
    let lastDay = ''
    for (const entry of data || []) {
      const key = dayKey(entry.createdAt)
      out.push({ entry, dayHeader: key !== lastDay ? dayLabel(entry.createdAt) : undefined })
      lastDay = key
    }
    return out
  }, [data])

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading activity…" variant="list" />
      </NestedChrome>
    )
  }
  if (isError) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.entry._id}
        contentContainerStyle={listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
        renderItem={({ item }) => (
          <View>
            {item.dayHeader ? <Text style={styles.dayHeader}>{item.dayHeader}</Text> : null}
            <View style={styles.row}>
              <View style={styles.rail}>
                <View style={styles.dot}>
                  <Ionicons
                    name={iconForAction(item.entry.action)}
                    size={14}
                    color={colors.accentHover}
                  />
                </View>
                <View style={styles.line} />
              </View>
              <View style={styles.body}>
                <Text style={styles.text}>{describe(item.entry)}</Text>
                <View style={styles.byline}>
                  {item.entry.actor ? (
                    <Avatar name={item.entry.actor.name} uri={item.entry.actor.avatar} size={18} />
                  ) : null}
                  <Text style={styles.meta} numberOfLines={1}>
                    {[item.entry.actor?.name || 'Someone', timeAgo(item.entry.createdAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="pulse-outline"
            title="No activity yet"
            body="Task changes, uploads, and approvals on this project will show up here."
          />
        }
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    dayHeader: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing.md,
      marginBottom: 2,
    },
    row: { flexDirection: 'row', gap: spacing.md },
    rail: { alignItems: 'center', width: 28 },
    dot: {
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    line: { flex: 1, width: StyleSheet.hairlineWidth, backgroundColor: c.border, marginTop: 2 },
    body: { flex: 1, minWidth: 0, paddingBottom: spacing.lg, gap: 4 },
    text: { ...typography.body, color: c.textPrimary },
    byline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { ...typography.caption, color: c.textSecondary, flexShrink: 1 },
  })
}
