import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Fab } from '../../components/Fab'
import { Avatar } from '../../components/Avatar'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { siteFeedApi } from '../../api/siteFeed'
import { isApiError } from '../../api/client'
import type { SiteUpdate } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'
import { timeAgo } from '../../utils/time'

type Props = NativeStackScreenProps<SharedOpsParamList, 'SiteFeed'>

export function SiteFeedScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId, projectName } = route.params || {}
  const [selected, setSelected] = useState<SiteUpdate | null>(null)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['site-updates', projectId ?? 'all'],
    queryFn: () => siteFeedApi.updates(projectId ? { projectId } : undefined),
  })

  const chromeProps = {
    title: "Site updates",
    subtitle: "Photos and daily logs",
    subtitleIcon: 'camera-outline' as const,
  }

  const selectedProjectName =
    selected && typeof selected.projectId === 'object' ? selected.projectId?.name : undefined
  const photoCount = selected?.photos?.length ?? 0

  return (
    <NestedChrome {...chromeProps}>
      {isLoading ? (
        <LoadingState label="Loading site feed…" variant="cards" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(u) => u._id}
          contentContainerStyle={listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
            const photos = item.photos?.length ?? 0
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
                {photos > 0 ? (
                  <Text style={styles.photoHint}>
                    {photos} photo{photos === 1 ? '' : 's'}
                  </Text>
                ) : null}
              </SurfaceCard>
            )
          }}
          ListEmptyComponent={<EmptyState title="No site updates yet" body="Field progress notes will show up here." />}
        />
      )}

      <Fab
        label="Post update"
        onPress={() => navigation.navigate('PostSiteUpdate', { projectId, projectName })}
      />

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {selected ? (
              <>
                <View style={styles.cardTop}>
                  <Avatar name={selected.author.name} uri={selected.author.avatar} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.author} numberOfLines={1}>
                      {selected.author.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[selectedProjectName, timeAgo(selected.createdAt)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {selected.progress != null ? <Text style={styles.progress}>{selected.progress}%</Text> : null}
                </View>
                <Text style={styles.modalNote}>{selected.note}</Text>
                <Text style={styles.photoHint}>
                  {photoCount > 0
                    ? `${photoCount} photo${photoCount === 1 ? '' : 's'} attached`
                    : 'No photos attached'}
                </Text>
                <Pressable
                  style={styles.closeBtn}
                  onPress={() => setSelected(null)}
                  accessibilityRole="button"
                >
                  <Text style={styles.closeBtnLabel}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
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
    },
    modalNote: { ...typography.body, color: c.textPrimary },
    closeBtn: {
      marginTop: spacing.sm,
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    closeBtnLabel: { ...typography.captionStrong, color: c.textPrimary },
  })
}
