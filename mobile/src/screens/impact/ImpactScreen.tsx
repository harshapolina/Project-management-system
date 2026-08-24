import { useMemo } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { impactApi } from '../../api/impact'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Impact'>

export function ImpactScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['impact-me'],
    queryFn: impactApi.me,
    enabled: caps.impact,
  })

  const pageHeader = (
    <PageHeader
      title="Impact"
      subtitle="Points earned for finishing work well"
      subtitleIcon="trophy-outline"
      onBack={() => navigation.goBack()}
    />
  )

  if (!caps.impact) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <EmptyState title="Impact Points" body="This isn’t enabled for your role yet." />
      </Screen>
    )
  }

  if (isLoading) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading your score…" variant="dashboard" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      {pageHeader}
      <ScrollView
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
      >
        <SurfaceCard style={styles.scoreCard}>
          <Text style={styles.scoreEyebrow}>Your score</Text>
          <Text style={styles.scoreValue}>{data.score?.totalPoints ?? 0}</Text>
          <Text style={styles.scoreLabel}>total points</Text>
        </SurfaceCard>

        <SectionLabel count={data.badges.filter((b) => b.earned).length}>Badges</SectionLabel>
        <View style={styles.badgeGrid}>
          {data.badges.map((b) => (
            <View key={b.key} style={[styles.badge, !b.earned && styles.badgeLocked]}>
              <Text style={[styles.badgeLabel, !b.earned && styles.badgeLabelLocked]} numberOfLines={2}>
                {b.label}
              </Text>
            </View>
          ))}
        </View>

        <SectionLabel>By category</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {data.breakdown.length === 0 ? (
            <Text style={styles.muted}>No points scored yet.</Text>
          ) : (
            data.breakdown.map((row, idx) => (
              <View
                key={row.category}
                style={[styles.breakdownRow, idx > 0 && styles.rowBorder]}
              >
                <Text style={styles.breakdownLabel} numberOfLines={1}>
                  {row.category}
                </Text>
                <Text style={styles.breakdownValue}>{row.points} pts</Text>
              </View>
            ))
          )}
        </SurfaceCard>

        <SectionLabel>Recent</SectionLabel>
        <SurfaceCard style={styles.blockGap}>
          {data.timeline.length === 0 ? (
            <Text style={styles.muted}>Nothing scored recently.</Text>
          ) : (
            data.timeline.slice(0, 15).map((t, idx) => (
              <View key={t._id} style={[styles.timelineRow, idx > 0 && styles.rowBorder]}>
                <Text style={styles.timelineReason} numberOfLines={2}>
                  {t.reason}
                </Text>
                <Text style={styles.timelinePoints}>+{t.points}</Text>
              </View>
            ))
          )}
        </SurfaceCard>
      </ScrollView>
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    scoreCard: {
      alignItems: 'center',
      gap: 4,
      paddingVertical: 28,
      backgroundColor: c.accentSoft,
    },
    scoreEyebrow: { ...typography.micro, color: c.accent, textTransform: 'uppercase', letterSpacing: 0.8 },
    scoreValue: { ...typography.h1, fontSize: 48, color: c.textPrimary },
    scoreLabel: { ...typography.caption, color: c.textSecondary },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    badge: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      maxWidth: '48%',
    },
    badgeLocked: { opacity: 0.45 },
    badgeLabel: { ...typography.caption, color: c.textPrimary, fontWeight: '600' },
    badgeLabelLocked: { color: c.textMuted },
    blockGap: { gap: 0 },
    muted: { ...typography.caption, color: c.textMuted },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    rowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    breakdownLabel: { ...typography.body, color: c.textPrimary, textTransform: 'capitalize', flex: 1 },
    breakdownValue: { ...typography.bodyStrong, color: c.accent },
    timelineRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: 12,
    },
    timelineReason: { ...typography.caption, color: c.textSecondary, flex: 1 },
    timelinePoints: { ...typography.captionStrong, color: c.success },
  })
}
